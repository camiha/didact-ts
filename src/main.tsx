import Didact from "./didact";
import { useState, useEffect } from "./didact";

type FetchData = {
	isLoaded: boolean;
	user: {
		userId: number;
		id: number;
		title: string;
		completed: boolean;
	};
};

const initialData = {
	isLoaded: false,
	user: {
		userId: 0,
		id: 0,
		title: "initial title",
		completed: false,
	},
};

/** @jsx Didact.createElement */
function App() {
	const [count, setCount] = useState(1);
	const [data, setData] = useState<FetchData>(initialData);

	const handleCountUp = () => setCount((prev) => prev + 1);
	const handleCountDown = () => setCount((prev) => prev - 1);

	useEffect(async () => {
		const response = await fetch(
			"https://jsonplaceholder.typicode.com/todos/1",
		);
		const result = await response.json();
		setData(() => {
			return {
				isLoaded: true,
				user: result,
			};
		});
	}, []);

	return (
		<div>
			<p>Count: {count}</p>
			<button type="button" onClick={handleCountUp}>
				count up
			</button>
			<button type="button" onClick={handleCountDown}>
				count down
			</button>
			<hr />
			{data.isLoaded ? (
				<div>
					<p>user info</p>
					<p>id: {data.user.id}</p>
					<p>{data.user.title}</p>
				</div>
			) : (
				<p>loading...</p>
			)}
		</div>
	);
}

const element = <App />;
const container = document.getElementById("root") as HTMLElement;
Didact.render(element, container);
