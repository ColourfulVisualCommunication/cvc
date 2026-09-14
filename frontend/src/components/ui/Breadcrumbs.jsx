import { Link } from "react-router-dom";

/**
 * items: the trail after Home, e.g. [{ label: "Work", to: "/work" }, { label: project.title }]
 * — the last entry is the current page and never renders as a link.
 */
export default function Breadcrumbs({ items, className = "mb-6" }) {
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1.5 text-sm text-cvc-muted ${className}`}>
      <Link to="/" className="hover:text-cvc-paper">
        Home
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            {isLast || !item.to ? (
              <span className="text-cvc-paper">{item.label}</span>
            ) : (
              <Link to={item.to} className="hover:text-cvc-paper">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
