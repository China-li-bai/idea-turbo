'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './nav.module.scss';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/calendar-shift', label: '日历+排班', icon: '📅' },
    { path: '/shift-manager', label: '排班管理', icon: '🗓️' },
    { path: '/shift-demo', label: '排班演示', icon: '✨' },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>📅</span>
          <span className={styles.logoText}>智程日历</span>
        </Link>
        
        <div className={styles.navLinks}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.navLink} ${pathname === item.path ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
