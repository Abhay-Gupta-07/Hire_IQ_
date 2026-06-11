export interface MCQQuestion {
  id: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const MCQ_POOL: MCQQuestion[] = [
  {
    id: "mcq_1",
    question: "What will be the output of the following JavaScript closure code?",
    codeSnippet: `function createCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    getCount: () => count
  };
}
const counter = createCounter();
counter.increment();
console.log(counter.getCount());`,
    options: ["0", "1", "undefined", "ReferenceError"],
    correctIndex: 1,
    explanation: "The counter closure encapsulates the 'count' variable, so incrementing it changes the enclosed variable state, returning 1."
  },
  {
    id: "mcq_2",
    question: "In React, why can passing arrays or objects in a useEffect dependency array cause infinite render loops?",
    codeSnippet: `useEffect(() => {
  fetchData();
}, [{ status: 'active' }]);`,
    options: [
      "Because arrays and objects always trigger browser AudioContext locks",
      "Because React performs referential comparison (===), and a new object literal is created on every single render reference",
      "Because useEffect strictly requires primitive strings or numbers to allocate memory",
      "Because the hook executes asynchronously via the microtask queue"
    ],
    correctIndex: 1,
    explanation: "Objects and arrays compared via === in JavaScript are checked by reference. Since [{ status: 'active' }] is a new array literal containing a new object literal on every render, it fails referential equality (not the same memory block) and triggers the effect infinitely."
  },
  {
    id: "mcq_3",
    question: "Which of the following describes the difference between Microtasks and Macrotasks in the JavaScript Event Loop?",
    options: [
      "Microtasks run inside CSS engines, while Macrotasks run inside Service Workers",
      "Promises (then/catch) create microtasks which have higher priority and run entirely before the next macrotask (setTimeout/setInterval) is polled",
      "Macrotasks are executed inside Node.js, whereas microtasks are browser-only processes",
      "They have identical priorities and execute concurrently via Web Workers"
    ],
    correctIndex: 1,
    explanation: "The event loop has a dedicated queue for microtasks. At the end of every task execution stack, the microtask queue is flushed completely before continuing to the next macrotask (like setTimeout timers)."
  },
  {
    id: "mcq_4",
    question: "What is the primary benefit of using TypeScript Generics?",
    codeSnippet: `function getFirstItem<T>(arr: T[]): T {
  return arr[0];
}`,
    options: [
      "It compiles TS directly into bytecode rather than JS string files",
      "It allows writing reusable components/functions that handle multiple types while fully preserving compile-time type-safety variables",
      "It automatically optimizes DOM queries and garbage collections in the background",
      "It prevents files from violating browser iframe permission guidelines"
    ],
    correctIndex: 1,
    explanation: "Generics allow developers to pass types as parameters, giving high utility recyclability to data structures while keeping accurate types when returned."
  },
  {
    id: "mcq_5",
    question: "How does CSS flexbox property `flex-shrink: 0` affect an item?",
    options: [
      "It forces the item to expand and occupy all remaining container space",
      "It prevents the item from shrinking smaller than its basis size when the flex-container runs out of room",
      "It wraps the item text onto a separate nested grid column automatically",
      "It sets the element visibility to hidden when the screen splits to mobile views"
    ],
    correctIndex: 1,
    explanation: "`flex-shrink` defines the shrink factor. Setting it to 0 enforces a strict minimum width, preventing the item from squeezing or distorting."
  },
  {
    id: "mcq_6",
    question: "What will the following asynchronous Promise chain console log out?",
    codeSnippet: `Promise.resolve("A")
  .then(val => {
    console.log(val);
    return "B";
  })
  .then(val => {
    throw new Error("C");
  })
  .catch(err => "D")
  .then(val => console.log(val));`,
    options: [
      "A followed by D",
      "A followed by C followed by D",
      "A followed by C followed by type errors",
      "A with unresolved Promise states"
    ],
    correctIndex: 0,
    explanation: "First, 'A' is logged. Then, the next block throws an error which bypasses succeeding then blocks, catching inside .catch(err => 'D') which returns 'D', logging 'D' inside the last then block."
  },
  {
    id: "mcq_7",
    question: "What is a potential memory leak pitfall in a React class/functional component?",
    options: [
      "Failing to clear setTimout, setInterval, or window event listeners inside useEffect's return cleanup block",
      "Calling useState in a standard local render statement without triggering transitions",
      "Importing components from lucide-react rather than compiling raw SVG frames",
      "Using local let variables instead of useRef indicators for component references"
    ],
    correctIndex: 0,
    explanation: "Intervals and event listeners registered globally will persist even after the component is unmounted unless explicitly cleared, causing progressive memory leak degradation."
  },
  {
    id: "mcq_8",
    question: "What is the time complexity (Big O) of looking up a key in a standard JavaScript Map (or HashMap)?",
    options: [
      "O(1) - Constant Time average",
      "O(log N) - Logarithmic Time logarithmic scale",
      "O(N) - Linear Time proportional to map size",
      "O(N^2) - Quadratic Time quadratic index"
    ],
    correctIndex: 0,
    explanation: "Maps resolve keys using hashing algorithms, achieving near-uniform O(1) constant time retrievals regardless of map size."
  },
  {
    id: "mcq_9",
    question: "What is the output of checking comparative equality for reference structures in JavaScript?",
    codeSnippet: `const poolA = [1, 2, 3];
const poolB = [1, 2, 3];
console.log(poolA === poolB);`,
    options: ["true", "false", "undefined", "TypeError"],
    correctIndex: 1,
    explanation: "In JavaScript, arrays are reference types. Even though they contain identical values, poolA and poolB reference totally different objects in memory, resulting in false."
  },
  {
    id: "mcq_10",
    question: "Why should you prefer using `const` over `var` in modern JavaScript declarations?",
    options: [
      "const variables can be garbage collected while var elements cannot",
      "const provides block-scoping safeguards and prevents variable redeclaration, unlike var's function-scope hoisting rules",
      "const allows variables to be accessed prior to declaration inside microtask loops",
      "const variables compile significantly faster on Node.js containers than var"
    ],
    correctIndex: 1,
    explanation: "const/let are block-scoped, preventing hoisting bugs and variables leak variables out of nested blocks (like if statements), and prevent accidental re-assignments."
  },
  {
    id: "mcq_11",
    question: "In Express.js, what is the purpose of the `next()` callback parameter?",
    codeSnippet: `app.use((req, res, next) => {
  console.log("Middle block loaded");
  next();
});`,
    options: [
      "It skips the active API routes and renders Vite static index.html",
      "It hands control over to the next middleware function in the routing pipeline",
      "It closes the server socket connection gracefully with port 3000",
      "It resets req.body to clear memory buffers"
    ],
    correctIndex: 1,
    explanation: "Express uses a middleware chain. Calling next() triggers the next block or endpoint responder in sequence. If next() is not called, the request will hang permanently."
  },
  {
    id: "mcq_12",
    question: "What is the difference between `debounce` and `throttle` utilities?",
    options: [
      "Debounce restricts event trigger rates to mobile screens, throttle is desktop-only",
      "Debounce delays execution until a certain quiet period has elapsed. Throttle guarantees continuous periodic executions at a strict rate limit.",
      "Debounce is fully synchronous, throttle operates inside dedicated service worker loops",
      "No operational difference exists; they are synonymous helper words"
    ],
    correctIndex: 1,
    explanation: "Debounce waits for silence (e.g. typing keypresses stop). Throttle guarantees execution periodically (e.g. scroll/resize updates every 100ms)."
  },
  {
    id: "mcq_13",
    question: "What occurs during index configuration optimization on Database tables?",
    options: [
      "It increases query speed dramatically but makes inserts and writes slightly slower due to maintaining the search index",
      "It wipes duplicate data rows from database tables instantly",
      "It converts text records into audio WAV arrays automatically",
      "It restricts query usage to validated clients and enforces permissions"
    ],
    correctIndex: 0,
    explanation: "Indexes speed up data queries but must be recalculated upon database modification increments, slightly increasing insert/update times."
  },
  {
    id: "mcq_14",
    question: "What does the HTTP header `Cache-Control: no-cache` indicate to a browser client?",
    options: [
      "The client must delete all IndexedDB databases instantly",
      "The client must re-validate the integrity check with the origin server before serving a cached copy of the resource",
      "The client is completely offline and must serve local files",
      "The client must block the file stream to enforce CORS criteria"
    ],
    correctIndex: 1,
    explanation: "Contrary to popular belief, no-cache does not prevent caching. It instructs the browser that it must submit the request to the server to check for freshness before using the cached file."
  },
  {
    id: "mcq_15",
    question: "In React, why should you use standard key props when rendering sibling item lists?",
    options: [
      "To bind click event handlers onto custom element identifiers automatically",
      "To help React's virtual DOM diffing engine uniquely identify each node for state preservation and DOM item recycling",
      "To enforce sufficient color contrast across sibling text items",
      "To guarantee elements render under strict alphabetical ordering guidelines"
    ],
    correctIndex: 1,
    explanation: "Keys provide a stable identity to React's diffing engine, ensuring sibling elements are not mismatched or state gets garbled when items are sorted, inserted, or removed."
  }
];

export function getRandomMCQSelection(count: number = 4): MCQQuestion[] {
  const shuffled = [...MCQ_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
