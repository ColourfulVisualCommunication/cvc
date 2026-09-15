import { ChevronRight } from "lucide-react";

// The bold rounded chevron used everywhere an arrow accent is needed —
// one component so the weight/shape stays consistent instead of every
// call site picking its own stroke width.
export default function ArrowIcon({ size = 24, className = "", ...rest }) {
  return <ChevronRight size={size} strokeWidth={3} className={className} {...rest} />;
}
