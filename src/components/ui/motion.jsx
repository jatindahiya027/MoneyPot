"use client";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export const easeOut = [0.16, 1, 0.3, 1];

export function Motion({ children, className, distance = 10, ...props }) {
  const reduced = useReducedMotion();
  return <motion.div
    className={cn("motion-surface", className)}
    initial={reduced ? { opacity: 0 } : { opacity: 0, y: distance, filter: "blur(3px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(2px)" }}
    transition={{ duration: reduced ? 0.12 : 0.28, ease: easeOut }}
    {...props}
  >{children}</motion.div>;
}

export { motion, useReducedMotion } from "motion/react";
export { AnimatePresence, LayoutGroup } from "motion/react";
