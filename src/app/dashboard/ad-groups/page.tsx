export default function AdGroupsPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-normal text-[#202124] mb-2">廣告群組</h1>
      <p className="text-sm text-[#5f6368] mb-6">
        管理您的廣告群組設定與出價策略
      </p>
      <div className="border border-[#dadce0] rounded-lg p-12 text-center">
        <div className="text-[#5f6368] text-sm">
          廣告群組資料將根據廣告活動自動產生。
          <br />
          請至{" "}
          <a href="/dashboard/campaigns" className="text-[#1a73e8] hover:underline">
            廣告活動
          </a>{" "}
          頁面管理您的廣告。
        </div>
      </div>
    </div>
  );
}
