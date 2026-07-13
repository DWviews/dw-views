export default function AdsPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-normal text-[#202124] mb-2">廣告與素材</h1>
      <p className="text-sm text-[#5f6368] mb-6">
        管理廣告文案、圖片與影片素材
      </p>
      <div className="border border-[#dadce0] rounded-lg p-12 text-center">
        <div className="text-[#5f6368] text-sm">
          廣告素材管理功能即將推出。
          <br />
          目前可透過{" "}
          <a
            href="/dashboard/admin/ads-data"
            className="text-[#1a73e8] hover:underline"
          >
            ADS 資料管理
          </a>{" "}
          新增廣告活動數據。
        </div>
      </div>
    </div>
  );
}
