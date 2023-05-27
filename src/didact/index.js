let nextUnitOfWork = null;
let currentRoot = null;
let wipRoot = null;
let deletions = null;

function createElement(type, props, ...children) {
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

function createTextElement(text) {
	return {
		type: "TEXT_ELEMENT",
		props: {
			nodeValue: text,
			children: [],
		},
	};
}

const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children";
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);

function updateDom(dom, prevProps, nextProps) {
	// Remove old properties
	Object.keys(prevProps)
		.filter(isProperty)
		.filter(isGone(prevProps, nextProps))
		.forEach((name) => {
			dom[name] = "";
		});

	// Set new or changed properties
	Object.keys(nextProps)
		.filter(isProperty)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			dom[name] = nextProps[name];
		});

	//　Remove old or changed event listeners
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
	// TODO add nodes to dom
	commitWork(wipRoot.child);
	currentRoot = wipRoot;
	wipRoot = null;
}

// 全てのノードをDOMに追加・再帰的に処理を行う
function commitWork(fiber) {
	if (!fiber) {
		return;
	}

	let domParentFiber = fiber.parent;
	while (!domParentFiber.dom) {
		domParentFiber = domParentFiber.parent;
	}
	const domParent = domParentFiber.dom;

	if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
		domParent.appendChild(fiber.dom);
	} else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
		updateDom(fiber.dom, fiber.alternate.props, fiber.props);
	} else if (fiber.effectTag === "DELETION") {
		// domParent.removeChild(fiber.dom)
		commitDeletion(fiber, domParent);
	}

	commitWork(fiber.child);
	commitWork(fiber.sibling);
}

// 関数コンポーネントの時は、 DOM ノードが存在しないため見つかるまで再帰的に移動
function commitDeletion(fiber, domParent) {
	if (fiber.dom) {
		domParent.removeChild(fiber.dom);
	} else {
		commitDeletion(fiber.child.domParent);
	}
}

function workLoop(deadline) {
	let shouldYield = false;
	while (nextUnitOfWork && !shouldYield) {
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		shouldYield = deadline.timeRemaining() < 1;
	}

	// 全ての作業が終了したら、ファイバーツリー全体を DOM にコミット
	if (!nextUnitOfWork && wipRoot) {
		commitRoot();
	}

	requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

// 親子・兄弟関係を元にしたノード間のマッピングを行い、
// 優先度に応じた作業単位の返却を行う
function performUnitOfWork(fiber) {
	const isFunctionComponent = fiber.type instanceof Function;

	if (isFunctionComponent) {
		updateFunctionComponent(fiber);
	} else {
		updateHostComponent(fiber);
	}

	// const elements = fiber.props.children
	// reconcileChildren(fiber, elements)

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
		nextFiber = nextFiber.parent; // 親要素に戻る
	}
}

let wipFiber = null;
let hookIndex = null;

function updateFunctionComponent(fiber) {
	wipFiber = fiber;
	hookIndex = 0;
	wipFiber.hooks = [];
	const children = [fiber.type(fiber.props)];
	reconcileChildren(fiber, children);
}

function useState(initial) {
	const oldHook =
		wipFiber.alternate &&
		wipFiber.alternate.hooks &&
		wipFiber.alternate.hooks[hookIndex];
	const hook = {
		state: oldHook ? oldHook.state : initial,
		queue: [],
	};

	const actions = oldHook ? oldHook.queue : [];
	actions.forEach((action) => {
		hook.state = action(hook.state);
	});

	const setState = (action) => {
		hook.queue.push(action);
		wipRoot = {
			dom: currentRoot.dom,
			props: currentRoot.props,
			alternate: currentRoot,
		};
		nextUnitOfWork = wipRoot;
		deletions = [];
	};

	wipFiber.hooks.push(hook);
	hookIndex++;
	return [hook.state, setState];
}

function updateHostComponent(fiber) {
	if (!fiber.dom) {
		fiber.dom = createDom(fiber);
	}

	reconcileChildren(fiber, fiber.props.children);
}

function reconcileChildren(wipFiber, elements) {
	let index = 0;
	// 前回のレンダリング時のファイバーを取得
	let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
	let prevSibling = null;

	// 子要素ごとに新しいファイバーを作成
	while (index < elements.length || oldFiber != null) {
		const element = elements[index];
		let newFiber = null;

		const sameType = oldFiber && element && element.type == oldFiber.type;

		// 既存のものに parent / dom を追加

		// 古いファイバーと新しい要素が同じタイプの場合
		// DOMノードを保持し、新しいpropsで更新
		if (sameType) {
			newFiber = {
				type: oldFiber.type,
				props: element.props,
				dom: oldFiber.dom,
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
				dom: null,
				parent: wipFiber,
				alternate: null,
				effectTag: "PLACEMENT",
			};
		}
		// タイプが異なり、古いファイバーがある場合は、古いノードを削除
		if (oldFiber && !sameType) {
			oldFiber.effectTag = "DELETION";
			deletions.push(oldFiber);
		}

		if (oldFiber) {
			oldFiber = oldFiber.sibling;
		}

		// 最初の子要素の場合は 親要素の child に設定
		if (index === 0) {
			wipFiber.child = newFiber;
		} else {
			// 2つ目以降の子要素の場合は、前の要素の sibling（兄弟要素） に設定
			prevSibling.sibling = newFiber;
		}

		// 今回作成したものを、次回参照ように prevSibling に設定
		prevSibling = newFiber;
		index++;
	}
}

function createDom(fiber) {
	const dom =
		fiber.type == "TEXT_ELEMENT"
			? document.createTextNode("")
			: document.createElement(fiber.type);

	updateDom(dom, {}, fiber.props);

	return dom;
}

function render(element, container) {
	// progress root とも
	// ファイバーツリー のルートを追跡
	wipRoot = {
		dom: container,
		props: {
			children: [element],
		},
		alternate: currentRoot,
	};
	deletions = [];

	// ここで nextUnitOfWork が null でなくなることで、
	// workLoop が実行されるようになる
	nextUnitOfWork = wipRoot;
}

export default { createElement, render, useState };
