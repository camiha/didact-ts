# Didact-ts

tiny React Clone in TypeScript.  
I started this project because I am interested in how react works.  

## Hooks
### useState
```tsx
import { render, createElement, useState } from "./didact";

/** @jsx createElement */
function App() {
  const [count, setCount] = useState(1);
  const handleCountUp = () => setCount((prev) => prev + 1);
  const handleCountDown = () => setCount((prev) => prev - 1);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleCountUp}>count up</button>
      <button onClick={handleCountDown}>count down</button>
    </div>
  );
}

const element = <App />;
const container = document.getElementById("root") as HTMLElement;
render(element, container);
```

### useEffect
```tsx
import { render, createElement, useState, useEffect } from "./didact";

/** @jsx createElement */
function App() {
  const [data, setData] = useState<FetchData>(initialData);

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
render(element, container);
```

## TODO
- [ ] fix TS17004 error(with create own jsx factory)
- [ ] support style object
- [ ] add memo hooks

## thanks
These projects have made learning fun. thanks!

https://pomb.us/build-your-own-react/  
https://github.com/pomber/didact  
https://github.com/manasb-uoe/didact/  
https://github.com/davidbarone/didact  