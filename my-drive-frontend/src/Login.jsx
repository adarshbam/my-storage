import { useState } from "react";
import "./Login.css";
import { Link, useNavigate } from "react-router-dom";
import { SERVER_URL } from "./api";
import AuthInput from "./components/AuthInput";
import { validateEmail } from "./utils/validation";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Real-time validation
    let errorMsg = null;
    if (name === "email") {
      errorMsg = validateEmail(value);
    }

    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: errorMsg,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Login Logic:", formData);
    try {
      const response = await fetch(`${SERVER_URL}/user/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        alert("Login successful");
        // Optionally redirect or storing token
        navigate("/");
      } else if (response.status === 404) {
        setErrors((prev) => ({
          ...prev,
          email: data.emailerr,
          password: data.passworderr,
        }));
      } else {
        alert("Login failed due to server error");
      }
      console.log(data);
    } catch (error) {
      console.error("Error logging in:", error);
      alert("An error occurred during login.");
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2 className="register-title">Login</h2>
        <form onSubmit={handleSubmit}>
          <AuthInput
            label="Email"
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
          />
          <AuthInput
            label="Password"
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
          />
          <button type="submit" className="submit-btn">
            Sign In
          </button>
        </form>
        <Link to="/register" className="auth-link">
          Don't have an account? Register
        </Link>
      </div>
    </div>
  );
};

export default Login;
