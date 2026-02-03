import { Link } from "react-router-dom";
import "./Navbar.css";
import UserMenu from "./UserMenu";
import { useEffect, useState } from "react";
import { getUser } from "./utils";

const Navbar = () => {
  const [user, setUser] = useState();
  useEffect(() => {
    getUser(setUser);
  }, []);

  return (
    <header>
      <nav className="navbar">
        <div className="logo" title="Root Directory">
          <Link to="/" style={{ color: "white", textDecoration: "none" }}>
            <img src="/logo.png" alt="Logo" />
          </Link>
        </div>
        <ul
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
            fontWeight: "bold",
          }}
        >
          <Link
            to="/trash"
            style={{ color: "white", textDecoration: "none", width: "30px" }}
            title="Trash"
          >
            <img src="/features/recycle-bin.png" alt="Trash" />
          </Link>
          <UserMenu user={user} refreshUser={() => getUser(setUser)} />
        </ul>
      </nav>
    </header>
  );
};

export default Navbar;
