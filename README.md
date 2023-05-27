# Didact-ts

tiny React Clone in TypeScript.  
I started this project because I am interested in how react works.  

## Hooks
### useState
```tsx
import Didact from "./didact";
import { useState, useEffect } from "./didact";

function App() {
  const [count, setCount] = useState(1);
  const handleCountUp = () => setCount((prev) => prev + 1);
  const handleCountDown = () => setCount((prev) => prev - 1);

  return (
    <div>
      <p>Count: {count}</p>
      <button type="button" onClick={handleCountUp}>
        count up
      </button>
      <button type="button" onClick={handleCountDown}>
        count down
      </button>
    </div>
  );
}

const element = <App />;
const container = document.getElementById("root") as HTMLElement;
Didact.render(element, container);
```

### useEffect
```tsx
import Didact from "./didact";
import { useState, useEffect } from "./didact";

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
Didact.render(element, container);
```

## Styling
style object supported

```tsx
<p style={{ color: "blue" }}>Count: {count}</p>
```

## TODO
- [ ] add memo hooks

## thanks
These projects have made learning fun. thanks!

https://pomb.us/build-your-own-react/  
https://github.com/pomber/didact  
https://github.com/manasb-uoe/didact/  
https://github.com/davidbarone/didact  