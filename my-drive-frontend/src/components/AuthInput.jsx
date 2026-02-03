import React from "react";
import "../Register.css"; // Reuse existing styles

const AuthInput = ({
  label,
  id,
  type,
  name,
  value,
  onChange,
  error,
  required,
}) => {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input
        type={type}
        id={id}
        name={name}
        className={`form-control ${error ? "is-invalid" : ""}`}
        value={value}
        onChange={onChange}
        required={required}
      />
      {error && <div className="error-msg">{error}</div>}
    </div>
  );
};

export default AuthInput;
