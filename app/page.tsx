import { BoltIcon, ClockIcon, ShieldCheckIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { getUserEmail } from "@/lib/auth";
import { getAppUser, getTasksForUser } from "@/lib/rpa";
import { RunButton } from "@/components/run-button";
import { AdminRpaForm } from "@/components/admin-rpa-form";

function formatDate(value: string | null) {
  if (!value) return "실행 기록 없음";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function Home() {
  const email = await getUserEmail();
  const user = email ? await getAppUser(email) : null;
  const tasks = user ? await getTasksForUser(user) : [];
  const activeCount = tasks.filter(({ status }) => status === "active").length;

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><BoltIcon /></span><span>RPA<br />Restart</span></div>
        <nav aria-label="주 메뉴">
          <a className="nav-item active" href="#tasks"><Squares2X2Icon />나의 자동화</a>
          <a className="nav-item" href="#history"><ClockIcon />실행 이력</a>
        </nav>
        <div className="security-note"><ShieldCheckIcon /><div><strong>권한 기반 접근</strong><p>할당된 자동화만 표시됩니다.</p></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">AUTOMATION CONTROL DESK</span><h1>나의 자동화</h1></div>
          <div className="identity"><span className="avatar">{email?.slice(0, 1).toUpperCase() ?? "?"}</span><div><strong>{user?.displayName ?? email?.split("@")[0] ?? "로그인 필요"}{user?.role === "admin" && <em>ADMIN</em>}</strong><span>{email ?? "Azure에서 로그인해 주세요"}</span></div></div>
        </header>

        <div className="summary-strip">
          <div><span>사용 가능</span><strong>{activeCount}</strong><small>ACTIVE FLOWS</small></div>
          <div><span>전체 할당</span><strong>{tasks.length}</strong><small>ASSIGNED</small></div>
          <p><i className="pulse" /> 시스템 연결 상태 <b>{process.env.USE_DEMO_DATA === "true" ? "미리보기" : "정상"}</b></p>
        </div>

        {user?.role === "admin" && <section className="admin-panel"><div><span>ADMIN CONSOLE</span><h2>RPA 관리</h2><p>전체 자동화를 확인하고 새로운 과제를 등록할 수 있습니다.</p></div><AdminRpaForm /></section>}

        <section id="tasks" className="task-section">
          <div className="section-heading"><div><h2>실행할 과제를 선택하세요</h2><p>실행 버튼을 누르면 자동화 요청이 즉시 접수됩니다.</p></div><span>{tasks.length} AUTOMATIONS</span></div>
          {!email ? (
            <div className="empty"><ShieldCheckIcon /><h3>로그인이 필요합니다</h3><p>Azure App Service 인증을 완료하면 할당된 자동화가 표시됩니다.</p></div>
          ) : !user ? (
            <div className="empty"><ShieldCheckIcon /><h3>사용 권한이 없습니다</h3><p>관리자에게 RPA Restart 사용자 등록을 요청해 주세요.</p></div>
          ) : tasks.length === 0 ? (
            <div className="empty"><Squares2X2Icon /><h3>할당된 자동화가 없습니다</h3><p>관리자에게 RPA 과제 권한을 요청해 주세요.</p></div>
          ) : (
            <div className="task-grid">
              {tasks.map((task, index) => (
                <article className="task-card" key={task.id}>
                  <div className="card-top"><span className="task-number">{String(index + 1).padStart(2, "0")}</span><span className={`status ${task.status}`}>{task.status === "active" ? "실행 가능" : task.status === "maintenance" ? "점검 중" : "중지"}</span></div>
                  <div className="category">{task.category}</div><h3>{task.name}</h3><p>{task.description}</p>
                  <div className="card-footer"><span><ClockIcon />{user?.role === "admin" ? `${task.assignedUserCount ?? 0}명 사용 · ` : ""}{formatDate(task.lastRunAt)}</span><RunButton taskId={task.id} disabled={task.status !== "active"} /></div>
                </article>
              ))}
            </div>
          )}
        </section>
        <footer>RPA RESTART · INTERNAL AUTOMATION SERVICE</footer>
      </section>
    </main>
  );
}
