import { useState } from "react";
import "./Register.css";

import { Link, useNavigate } from "react-router-dom";
import { SERVER_URL } from "./api";
import AuthInput from "./components/AuthInput";
import { validateEmail, validatePassword } from "./utils/validation";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "admin",
    email: "adarshsingh922007@gmail.com",
    password: "Rain1$train",
  });

  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const [isSuccess, setIsSuccess] = useState(null);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Real-time validation
    let errorMsg = null;
    if (name === "email") {
      errorMsg = validateEmail(value);
      setIsSuccess(null);
      setError("");
    } else if (name === "password") {
      errorMsg = validatePassword(value);
    }

    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: errorMsg,
    }));
  };

  //
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final validation before submit
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
      });
      return;
    }

    if (isSuccess === true) {
      console.log("Already registered");
      navigate("/");
      return;
    }

    console.log("Register Logic:", formData);
    const response = await fetch(`${SERVER_URL}/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
    const data = await response.json();
    if (response.ok) {
      setIsSuccess(true);
      alert("User registered successfully");
    } else {
      setIsSuccess(false);
      setError(data.message);
    }
    console.log(data);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2 className="register-title">Register</h2>
        <form onSubmit={handleSubmit}>
          <AuthInput
            label="Name"
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
          />
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

          <p style={{ color: "red" }}>{error}</p>

          <button
            type="submit"
            className="submit-btn"
            style={{
              backgroundColor:
                isSuccess === null ? "black" : isSuccess ? "green" : "red",
              color: "white",
            }}
          >
            {isSuccess ? "Registered" : "Sign Up"}
          </button>
        </form>
        <Link to="/login" className="auth-link">
          Already have an account? Login
        </Link>
      </div>
    </div>
  );
};

export default Register;
