export default function ProfilePage({ params }: { params: { id: string } }) {
  return (
    <div className="flex-1 flex flex-col p-6">
      <h1 className="text-2xl font-bold">Trang cá nhân của: {params.id}</h1>
      {/* Sau này ta sẽ nhúng UserProfile và danh sách Thread vào đây */}
    </div>
  );
}