export type RequestIdleCallbackDeadline = {
	readonly didTimeout: boolean;
	timeRemaining: () => number;
};

export type DomNode = HTMLElement | Text;
export type Fiber = {
	type?: string | Function;
	props: {
		children: Fiber[];
		[key: string]: any;
	};
	dom?: DomNode;
	parent?: Fiber;
	sibling?: Fiber;
	child?: Fiber;
	alternate?: Fiber;
	effectTag?: string;
	hooks?: any[];
};

export type AppState = {
	currentRoot: Fiber;
	deletions: Fiber[];
	wipFiber: Fiber;
	nextUnitOfWork?: Fiber;
	wipRoot?: Fiber;
	hookIndex: number;
};
