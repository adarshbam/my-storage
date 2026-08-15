import React from "react";

/**
 * YouTube-style Shimmer Skeleton Primitive
 * GPU-accelerated gradient wave overlay with butter-smooth animation.
 */
export const Skeleton = ({
  className = "",
  variant = "rectangular", // rectangular | circular | text | rounded
  width,
  height,
  style = {},
  ...props
}) => {
  const variantClasses = {
    rectangular: "rounded-lg",
    rounded: "rounded-2xl",
    circular: "rounded-full",
    text: "rounded-md h-4 w-full",
  };

  const baseStyle = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
    ...style,
  };

  return (
    <div
      className={`skeleton-shimmer ${variantClasses[variant] || "rounded-lg"} ${className}`}
      style={baseStyle}
      aria-hidden="true"
      {...props}
    />
  );
};

export default Skeleton;
