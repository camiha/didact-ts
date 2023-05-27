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
	dom?: DomNode | null;
	parent?: Fiber | null;
	sibling?: Fiber | null;
	child?: Fiber | null;
	alternate?: Fiber | null;
	effectTag?: string;
	hooks?: any[];
};

export type AppState = {
	currentRoot: Fiber;
	deletions: Fiber[];
	wipFiber: Fiber;
	nextUnitOfWork?: Fiber;
	wipRoot?: Fiber | null;
	hookIndex: number;
};
