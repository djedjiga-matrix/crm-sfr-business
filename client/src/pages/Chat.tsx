import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';

const Chat = () => {
    return (
        <div className="flex h-full bg-white dark:bg-[#0E0E11] overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <ChatSidebar />
            <ChatWindow />
        </div>
    );
};

export default Chat;
