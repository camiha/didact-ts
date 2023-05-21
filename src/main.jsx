function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object" ? child : createTextElement(child)
      )
    }
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  };
}

let nextUnitOfWork = null

function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

// 親子・兄弟関係を元にしたノード間のマッピングを行い、
// 優先度に応じた作業単位の返却を行う
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }

  const elements = fiber.props.children
  let index = 0
  let prevSibling = null

  // 子要素ごとに新しいファイバーを作成
  while (index < elements.length) {
    const element = elements[index]
    console.log(element)

    // 既存のものに parent / dom を追加
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    }

    // 最初の子要素の場合は 親要素の child に設定
    if (index === 0) {
      fiber.child = newFiber
    } else {
      // 2つ目以降の子要素の場合は、前の要素の sibling（兄弟要素） に設定
      prevSibling.sibling = newFiber
    }

    // 今回作成したものを、次回参照ように prevSibling に設定
    prevSibling = newFiber
    index++
  }

  // 子要素 => 兄弟要素 => 叔父の順で要素を返す
  if (fiber.child) {
    return fiber.child
  }

  // 子要素が存在しない場合
  let nextFiber = fiber

  while (nextFiber) {
    if (nextFiber.sibling) { // 次の兄弟要素を返す
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent // 親要素に戻る
  }
}

function createDom(fiber) {
  const dom =
    fiber.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type)

  const isProperty = key => key !== "children"
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = fiber.props[name]
    })

  return dom
}
function render(element, container) {
  // ここで nextUnitOfWork が null でなくなることで、
  // workLoop が実行されるようになる
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  }
}

const Didact = {
  createElement,
  render
};

/** @jsx Didact.createElement */
const element = (
  <div style="background: salmon">
    <h1>Hello World</h1>
    <h2 style="text-align:right">from Didact</h2>
  </div>
);

const container = document.getElementById("root");
Didact.render(element, container);
