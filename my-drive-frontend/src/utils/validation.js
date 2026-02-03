export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Invalid email format";
  }
  return null;
};

export const validatePassword = (password) => {
  if (password.length < 5) {
    return "Password must be at least 5 characters long";
  }
  const symbolRegex = /[!@#$%^&*(),.?":{}|<>]/;
  if (!symbolRegex.test(password)) {
    return "Password must contain at least one special character";
  }
  return null;
};
