import Link from 'next/link';

// The server reader already supplies /locale/slug. Do not localize it again.
export default function DynamicNavigationLinks({items, className, onNavigate}) {
  return items.map(item => (
    <Link key={item.id} href={item.href} className={className} onClick={onNavigate}
      data-dynamic-page-id={item.id}>
      {item.label}
    </Link>
  ));
}
