import { createBrowserRouter, RouterProvider } from "react-router-dom";
import DirectoryView from "./DirectoryView";
import Register from "./Register";
import Login from "./Login";
import TrashView from "./TrashView";
import Layout from "./Layout";

import "./App.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />, // 👈 Navbar always here
    children: [
      {
        index: true, // "/"
        element: <DirectoryView />,
      },
      {
        path: "directory/:dirId",
        element: <DirectoryView />,
      },
      {
        path: "trash",
        element: <TrashView />,
      },
      {
        path: "trash/:id",
        element: <TrashView />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        path: "login",
        element: <Login />,
      },
    ],
  },
]);

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}
