import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary";
};

export function Button({ variant = "default", className, ...rest }: Props) {
  const classes = ["button", variant === "primary" && "button--primary", className]
    .filter(Boolean)
    .join(" ");
  return <button className={classes} {...rest} />;
}
