import type { RequestIdleCallbackDeadline, DomNode, Fiber } from "./types";
import { appState } from "./state";
import { isEvent, isGone, isNew, isProperty } from "../util";

function styleObjectToString(style: any) {
	return Object.keys(style).reduce(
		(acc, key) =>
			`${acc}${key.split(/(?=[A-Z])/).join("-").toLowerCase()}:${style[key]};`,
		"",
	);
}

function createElement(type: string, props: any, ...children: any[]) {
	return {
		type,
		props: {
			...props,
			children: children.map((child) =>
				typeof child === "object" ? child : createTextElement(child),
			),
		},
	};
}

function createTextElement(text: string) {
	return {
		type: "TEXT_ELEMENT",
		props: {
			nodeValue: text,
			children: [],
		},
	};
}

function updateDom(dom: DomNode, prevProps: any, nextProps: any) {
	// Remove old properties
	Object.keys(prevProps)
		.filter(isProperty)
		.filter(isGone(nextProps))
		.forEach((name) => {
			(dom as any)[name] = "";
		});

	// Set new or changed properties
	Object.keys(nextProps)
		.filter(isProperty)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			if (name === "style") {
				(dom as any)[name] = styleObjectToString(nextProps[name]);
			} else {
				(dom as any)[name] = nextProps[name];
			}
		});

	// Remove old or changed event listeners
	Object.keys(prevProps)
		.filter(isEvent)
		.filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			dom.removeEventListener(eventType, prevProps[name]);
		});

	// Add event listeners
	Object.keys(nextProps)
		.filter(isEvent)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			dom.addEventListener(eventType, nextProps[name]);
		});
}

function commitRoot() {
	appState.deletions.forEach(commitWork);

	if (appState.wipRoot?.child) {
		commitWork(appState.wipRoot.child);
		appState.currentRoot = appState.wipRoot;
	}

	appState.wipRoot = undefined;
}

// 全てのノードをDOMに追加・再帰的に処理を行う
function commitWork(fiber?: Fiber) {
	if (!fiber) {
		return;
	}

	let domParentFiber = fiber.parent;
	while (!domParentFiber?.dom) {
		domParentFiber = domParentFiber?.parent;
	}
	const domParent = domParentFiber.dom;

	if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
		domParent.appendChild(fiber.dom);
	} else if (
		fiber.effectTag === "UPDATE" &&
		fiber.dom != null &&
		fiber.alternate
	) {
		updateDom(fiber.dom, fiber.alternate.props, fiber.props);
	} else if (fiber.effectTag === "DELETION") {
		// domParent.removeChild(fiber.dom)
		commitDeletion(fiber, domParent);
	}

	commitWork(fiber.child as Fiber);
	commitWork(fiber.sibling as Fiber);
}

// 関数コンポーネントの時は、 DOM ノードが存在しないため見つかるまで再帰的に移動
function commitDeletion(fiber: Fiber, domParent: DomNode) {
	if (fiber.dom) {
		domParent.removeChild(fiber.dom);
	} else if (fiber?.child) {
		commitDeletion(fiber.child, domParent);
	}
}

function workLoop(deadline: RequestIdleCallbackDeadline) {
	let shouldYield = false;
	while (appState.nextUnitOfWork && !shouldYield) {
		appState.nextUnitOfWork = performUnitOfWork(appState.nextUnitOfWork);
		shouldYield = deadline.timeRemaining() < 1;
	}

	// 全ての作業が終了したら、ファイバーツリー全体を DOM にコミット
	if (!appState.nextUnitOfWork && appState.wipRoot) {
		commitRoot();
	}

	requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

// 親子・兄弟関係を元にしたノード間のマッピングを行い、
// 優先度に応じた作業単位の返却を行う
function performUnitOfWork(fiber: Fiber) {
	const isFunctionComponent = fiber.type instanceof Function;

	if (isFunctionComponent) {
		updateFunctionComponent(fiber);
	} else {
		updateHostComponent(fiber);
	}

	// 子要素 => 兄弟要素 => 叔父の順で要素を返す
	if (fiber.child) {
		return fiber.child;
	}

	// 子要素が存在しない場合
	let nextFiber = fiber;

	while (nextFiber) {
		if (nextFiber.sibling) {
			// 次の兄弟要素を返す
			return nextFiber.sibling;
		}
		nextFiber = nextFiber.parent as Fiber; // 親要素に戻る
	}
}

function updateFunctionComponent(fiber: Fiber) {
	appState.wipFiber = fiber;
	appState.hookIndex = 0;
	appState.wipFiber.hooks = [];
	const children = [(fiber.type as Function)(fiber.props)];
	reconcileChildren(fiber, children);
}

function updateHostComponent(fiber: Fiber) {
	if (!fiber.dom) {
		fiber.dom = createDom(fiber);
	}

	reconcileChildren(fiber, fiber.props.children);
}

function reconcileChildren(wipFiber: Fiber, elements: any) {
	let index = 0;
	// 前回のレンダリング時のファイバーを取得
	let oldFiber = wipFiber.alternate?.child;
	let prevSibling: Fiber | undefined = undefined;

	// 子要素ごとに新しいファイバーを作成
	while (index < elements.length || oldFiber !== undefined) {
		const element = elements[index];
		let newFiber: Fiber | undefined = undefined;

		const sameType = oldFiber && element && element.type === oldFiber.type;

		// 古いファイバーと新しい要素が同じタイプの場合
		// DOMノードを保持し、新しいpropsで更新
		if (sameType) {
			newFiber = {
				type: oldFiber?.type,
				props: element.props,
				dom: oldFiber?.dom,
				parent: wipFiber,
				alternate: oldFiber,
				effectTag: "UPDATE",
			};
		}
		// タイプが異なり、新しい要素がある場合は新しいDOMノードを作成
		if (element && !sameType) {
			newFiber = {
				type: element.type,
				props: element.props,
				dom: undefined,
				parent: wipFiber,
				alternate: undefined,
				effectTag: "PLACEMENT",
			};
		}
		// タイプが異なり、古いファイバーがある場合は、古いノードを削除
		if (oldFiber && !sameType) {
			oldFiber.effectTag = "DELETION";
			appState.deletions.push(oldFiber);
		}

		if (oldFiber) {
			oldFiber = oldFiber.sibling;
		}

		// 最初の子要素の場合は 親要素の child に設定
		if (index === 0) {
			wipFiber.child = newFiber;
		} else if (elements && prevSibling) {
			// 2つ目以降の子要素の場合は、前の要素の sibling（兄弟要素） に設定
			prevSibling.sibling = newFiber;
		}

		// 今回作成したものを、次回参照ように prevSibling に設定
		prevSibling = newFiber;
		index++;
	}
}

function createDom(fiber: Fiber) {
	const dom =
		fiber.type === "TEXT_ELEMENT"
			? document.createTextNode("")
			: document.createElement(fiber.type as string);

	updateDom(dom, {}, fiber.props);
	return dom;
}

function render(element: any, container: DomNode) {
	// progress root とも
	// ファイバーツリー のルートを追跡
	appState.wipRoot = {
		dom: container,
		props: {
			children: [element],
		},
		alternate: appState.currentRoot,
	};
	appState.deletions = [];

	// ここで appState.nextUnitOfWork が null でなくなることで、
	// workLoop が実行されるようになる
	appState.nextUnitOfWork = appState.wipRoot;
}

export { createElement, render };
