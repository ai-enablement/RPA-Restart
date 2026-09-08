import type { RpaTask } from "./types";

export const demoTasks: RpaTask[] = [
  {
    id: "4c696deb-88da-41b4-b41f-97657d3d57b3",
    name: "SAP 재고 현황 갱신",
    description: "법인별 재고 데이터를 수집하고 통합 현황을 갱신합니다.",
    category: "Supply Chain",
    status: "active",
    lastRunAt: "2026-09-08T08:42:00+09:00",
  },
  {
    id: "093468b1-0eb7-41b4-bccc-38348d76de01",
    name: "월 마감 자료 취합",
    description: "회계 마감 파일을 확인하고 지정 폴더에 취합합니다.",
    category: "Finance",
    status: "active",
    lastRunAt: "2026-09-07T18:10:00+09:00",
  },
  {
    id: "23c32979-b705-4576-948c-f0347a8dc6e2",
    name: "운송장 발행",
    description: "출고 확정 건의 운송장을 일괄 발행합니다.",
    category: "Logistics",
    status: "maintenance",
    lastRunAt: null,
  },
];
