import { ArrowLeftIcon, BoltIcon, ClockIcon, MagnifyingGlassIcon, ShieldCheckIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { getUserEmail } from "@/lib/auth";
import { getAppUser, getRunHistory } from "@/lib/rpa";

const statusLabels = { queued: "대기", running: "실행 중", succeeded: "성공", failed: "실패" } as const;
const triggerLabels = { restart: "재시작", schedule: "예약" } as const;

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; triggerType?: string }> }) {
  const email = await getUserEmail();
  const user = email ? await getAppUser(email) : null;
  const filters = await searchParams;
  const history = user ? await getRunHistory(user, { search: filters.q, status: filters.status, triggerType: filters.triggerType }) : [];

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><BoltIcon /></span><span>RPA<br />Restart</span></div>
      <nav aria-label="주 메뉴"><Link className="nav-item" href="/"><Squares2X2Icon />나의 자동화</Link><Link className="nav-item active" href="/history"><ClockIcon />실행 이력</Link></nav>
      <div className="security-note"><ShieldCheckIcon /><div><strong>권한 기반 접근</strong><p>{user?.role === "admin" ? "전체 실행 이력을 표시합니다." : "본인의 실행 이력만 표시됩니다."}</p></div></div>
    </aside>
    <section className="workspace">
      <header className="topbar history-topbar"><div><span className="eyebrow">AUTOMATION RUN LOG</span><h1>실행 이력</h1></div><Link className="back-link" href="/"><ArrowLeftIcon />자동화로 돌아가기</Link></header>
      <section className="history-section">
        <form className="history-filters" method="get">
          <label className="history-search"><MagnifyingGlassIcon /><input name="q" defaultValue={filters.q} placeholder="RPA 이름, 요청자, 상세 내용 검색" /></label>
          <select name="status" defaultValue={filters.status ?? ""} aria-label="상태 필터"><option value="">모든 상태</option><option value="queued">대기</option><option value="running">실행 중</option><option value="succeeded">성공</option><option value="failed">실패</option></select>
          <select name="triggerType" defaultValue={filters.triggerType ?? ""} aria-label="실행 방식 필터"><option value="">모든 실행 방식</option><option value="restart">재시작</option><option value="schedule">예약</option></select>
          <button type="submit">검색</button><Link href="/history">초기화</Link>
        </form>
        <div className="history-summary"><strong>{history.length}</strong>개의 실행 기록 <span>최근 200건까지 표시</span></div>
        {!user ? <div className="empty"><ShieldCheckIcon /><h3>사용 권한이 없습니다</h3><p>로그인하거나 관리자에게 권한을 요청해 주세요.</p></div>
        : history.length === 0 ? <div className="empty"><ClockIcon /><h3>조건에 맞는 실행 이력이 없습니다</h3><p>검색어나 필터를 변경해 보세요.</p></div>
        : <div className="history-table-wrap"><table className="history-table">
          <thead><tr><th>RPA</th><th>요청자</th><th>실행 방식</th><th>상태</th><th>요청 시각</th><th>완료 시각</th><th>상세</th></tr></thead>
          <tbody>{history.map((run) => <tr key={run.id}>
            <td><strong>{run.taskName}</strong><small>{run.id}</small></td><td>{run.requestedByEmail}</td>
            <td><span className={`trigger-badge ${run.triggerType}`}>{triggerLabels[run.triggerType]}</span></td>
            <td><span className={`run-status ${run.status}`}>{statusLabels[run.status]}</span></td>
            <td>{formatDate(run.requestedAt)}</td><td>{formatDate(run.completedAt)}</td><td className="history-detail" title={run.detail ?? ""}>{run.detail ?? "-"}</td>
          </tr>)}</tbody>
        </table></div>}
      </section>
      <footer>RPA RESTART · INTERNAL AUTOMATION SERVICE</footer>
    </section>
  </main>;
}
