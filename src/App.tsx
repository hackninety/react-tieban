import { useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { Seal } from './components/Seal';
import { THEME_LABEL, useTheme } from './theme';
import Home from './pages/Home';
import Volumes from './pages/Volumes';
import VerseView from './pages/VerseView';
import Search from './pages/Search';
import Tables from './pages/Tables';
import Annotated from './pages/Annotated';
import Method from './pages/Method';

const NAV = [
  { to: '/volumes', label: '条文库' },
  { to: '/search', label: '检索' },
  { to: '/tables', label: '取数表' },
  { to: '/annotated', label: '注解精选' },
  { to: '/method', label: '方法文献' },
];

export default function App() {
  const { theme, cycle } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const links = NAV.map((n) => (
    <NavLink key={n.to} to={n.to}
      onClick={() => setNavOpen(false)}
      className={({ isActive }) => (isActive ? 'active' : '')}>
      {n.label}
    </NavLink>
  ));
  return (
    <>
      <nav className="topnav">
        <button className="nav-burger" onClick={() => setNavOpen(true)} aria-label="打开菜单">☰</button>
        <Link className="brand" to="/" title="回到首页"><Seal text="铁数" size={30} />铁板神数</Link>
        <div className="nav-inline">{links}</div>
        <span className="spacer" />
        <button className="theme-btn" onClick={cycle}
          title={`当前「${THEME_LABEL[theme]}」· 点击切换主题`} aria-label="切换主题">
          ◐ {THEME_LABEL[theme]}
        </button>
      </nav>
      {/* 移动端抽屉：置于 nav 之外——topnav 的 backdrop-filter 会劫持 fixed 定位包含块 */}
      <div className={`nav-drawer${navOpen ? ' open' : ''}`} aria-hidden={!navOpen}>
        <Link className="brand" to="/" onClick={() => setNavOpen(false)}><Seal text="铁数" size={26} />铁板神数</Link>
        {links}
      </div>
      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} aria-hidden />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/volumes" element={<Volumes />} />
        <Route path="/v/:n" element={<VerseView />} />
        <Route path="/search" element={<Search />} />
        <Route path="/tables" element={<Tables />} />
        <Route path="/annotated" element={<Annotated />} />
        <Route path="/method" element={<Method />} />
      </Routes>
    </>
  );
}
