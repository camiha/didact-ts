import Didact from "./didact";

/** @jsx Didact.createElement */
function Counter() {
	const [state, setState] = Didact.useState(1);
	// TODO: jsx factory の調査・エラー対応
	// @ts-expect-error
	// rome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
	return <h1 onClick={() => setState((c) => c + 1)}>Count: {state}</h1>;
}

// @ts-expect-error
const element = <Counter />;
const container = document.getElementById("root") as HTMLElement;
Didact.render(element, container);
