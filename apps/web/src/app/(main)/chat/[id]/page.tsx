export default function ChatPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex-1 flex flex-col p-6">
      <h1 className="text-2xl font-bold">Kênh chat: {params.id}</h1>
      {/* Nơi chứa nội dung tin nhắn của kênh */}
    </div>
  );
}