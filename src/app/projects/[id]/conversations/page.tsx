'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProjectMessage } from '@/types';

export default function ConversationsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ProjectMessage['recipient_group']>('All Team');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/conversations?projectId=${projectId}`);
      const data = await res.json();
      const list = data.messages || [];
      if (list.length === 0) {
        // Initial sample communications
        const defaultMessages: ProjectMessage[] = [
          {
            id: 'msg-1',
            project_id: projectId,
            sender_name: 'Mo Li',
            sender_role: 'Project Manager',
            recipient_group: 'All Team',
            message_text: 'Reminder: The crane pick for RTU-1 is confirmed for Friday morning at 7:00 AM. Exclusion zone setup begins at 6:00 AM.',
            created_at: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: 'msg-2',
            project_id: projectId,
            sender_name: 'Apex Mechanical Lead',
            sender_role: 'Subcontractor Lead',
            recipient_group: 'All Team',
            message_text: 'Rigging crew and crane operator are confirmed. Gasket seal inspection has passed.',
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'msg-3',
            project_id: projectId,
            sender_name: 'Structural Engineer',
            sender_role: 'Design Team',
            recipient_group: 'Design Team',
            message_text: 'Structural angles per RFI-042 review verified on site.',
            created_at: new Date(Date.now() - 1800000).toISOString(),
          }
        ];
        setMessages(defaultMessages);
      } else {
        setMessages(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [projectId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          sender_name: 'Mo Li (PM)',
          sender_role: 'Project Manager',
          recipient_group: selectedGroup,
          message_text: inputMessage,
        }),
      });
      if (res.ok) {
        setInputMessage('');
        await fetchMessages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMessages = messages.filter(m => selectedGroup === 'All Team' || m.recipient_group === selectedGroup);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-procore-text tracking-tight">Conversations & Team Messaging</h1>
          <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
            Phase 8: Project Comms
          </span>
        </div>
        <p className="text-xs text-procore-text-muted mt-0.5">
          Centralized team and trade partner communication hub per ConsJ.rule section 8.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Channel Groups Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-procore-text-muted px-1">Channels & Groups</h2>
          {(['All Team', 'Trade Partners', 'Design Team', 'Ownership', 'Internal'] as const).map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                selectedGroup === group
                  ? 'bg-white border-procore-orange shadow-sm ring-1 ring-procore-orange'
                  : 'bg-white border-procore-border hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded bg-procore-orange-light text-procore-orange flex items-center justify-center text-xs font-bold">
                  #
                </span>
                <span className="font-bold text-xs text-procore-text">{group}</span>
              </div>
              <span className="text-[10px] text-procore-text-muted">
                {messages.filter(m => group === 'All Team' || m.recipient_group === group).length} msgs
              </span>
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-procore-border shadow-xs flex flex-col h-[520px]">
          {/* Channel Header */}
          <div className="p-3.5 border-b border-procore-border bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-procore-text">#{selectedGroup}</span>
              <span className="text-xs text-procore-text-muted">· Real-time thread</span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 divide-y divide-procore-border-light">
            {filteredMessages.map((msg) => (
              <div key={msg.id} className="pt-3 first:pt-0 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-procore-orange to-amber-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {msg.sender_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-procore-text">{msg.sender_name}</span>
                    <span className="text-[10px] text-procore-text-muted font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                      {msg.sender_role}
                    </span>
                    <span className="text-[10px] text-procore-text-muted ml-auto">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-procore-text mt-1">{msg.message_text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-procore-border bg-gray-50 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Message #${selectedGroup}...`}
              className="flex-1 text-xs border border-procore-border p-2 rounded focus:border-procore-orange bg-white"
            />
            <button
              type="submit"
              className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-4 py-2 rounded transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
