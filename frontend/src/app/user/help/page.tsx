'use client';
import { useState, useEffect } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { ChevronDown, ChevronUp, Search, Mail, Phone, MessageSquare } from 'lucide-react';
import Modal from '@/components/Modal';
import apiClient from '@/utils/apiClient';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

interface ElectionCalendar {
  election_id: number;
  election_name: string;
  date_start: string;
  date_end: string;
  election_status: string;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return { firstDay, lastDay, days };
}

function getElectionColor(status: string) {
  switch (status) {
    case 'Ongoing': return 'bg-green-200 text-green-900 border-green-400';
    case 'Upcoming': return 'bg-blue-200 text-blue-900 border-blue-400';
    case 'Finished': return 'bg-gray-200 text-gray-700 border-gray-400';
    default: return 'bg-yellow-100 text-yellow-900 border-yellow-400';
  }
}

function CalendarView({ elections }: { elections: ElectionCalendar[] }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const { firstDay, days } = getMonthDays(year, month);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstWeekDay = firstDay.getDay();
  const totalCells = Math.ceil((firstWeekDay + days.length) / 7) * 7;

  // Filter elections that overlap with this month
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const electionsInMonth = elections.filter(e => {
    const start = new Date(e.date_start);
    const end = new Date(e.date_end);
    return (
      (start <= monthEnd && end >= monthStart)
    );
  });

  // Navigation
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <div className="mx-auto" style={{ width: '80%' }}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="px-2 py-1 rounded hover:bg-gray-100">&lt;</button>
        <div className="font-semibold text-lg">{new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
        <button onClick={nextMonth} className="px-2 py-1 rounded hover:bg-gray-100">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center font-medium text-gray-600">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-6">
        {Array.from({ length: totalCells }).map((_, idx) => {
          const dayNum = idx - firstWeekDay + 1;
          const isCurrentMonth = dayNum > 0 && dayNum <= days.length;
          return (
            <div key={idx} className={`min-h-[70px] border rounded p-1 ${isCurrentMonth ? '' : 'bg-gray-50 text-gray-300'}`}> 
              <div className={`text-xs font-bold ${isCurrentMonth && new Date(year, month, dayNum).toDateString() === new Date().toDateString() ? 'text-red-600' : ''}`}>{isCurrentMonth ? dayNum : ''}</div>
            </div>
          );
        })}
      </div>
      {/* List elections for this month below the calendar */}
      <div className="mt-2">
        <h3 className="font-semibold mb-2 text-gray-800">Elections this month:</h3>
        {electionsInMonth.length === 0 ? (
          <div className="text-gray-500 text-sm">No elections scheduled for this month.</div>
        ) : (
          <ul className="space-y-2">
            {electionsInMonth.map(ev => (
              <li key={ev.election_id} className={`rounded border px-3 py-2 flex flex-col md:flex-row md:items-center gap-1 md:gap-4 ${getElectionColor(ev.election_status)}`}>
                <span className="font-semibold">{ev.election_name}</span>
                <span className="text-xs">[
                  <span className="font-medium">Start:</span> {new Date(ev.date_start).toLocaleDateString()} | 
                  <span className="font-medium">End:</span> {new Date(ev.date_end).toLocaleDateString()}
                ]</span>
                <span className="ml-auto text-xs font-bold">{ev.election_status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs items-center">
        <span className="font-semibold">Legend:</span>
        <span className="px-2 py-1 rounded border bg-green-200 border-green-400 text-green-900">Ongoing</span>
        <span className="px-2 py-1 rounded border bg-blue-200 border-blue-400 text-blue-900">Upcoming</span>
        <span className="px-2 py-1 rounded border bg-gray-200 border-gray-400 text-gray-700">Finished</span>
      </div>
    </div>
  );
}

export default function UserHelpPage() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportResult, setSupportResult] = useState<string | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [elections, setElections] = useState<ElectionCalendar[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const faqs: FAQ[] = [
    {
      question: "How do I cast my vote?",
      answer: "To cast your vote, navigate to the 'Cast Your Vote' page from the sidebar menu. You'll see a list of active elections. Click on the election you want to participate in, select your preferred candidate or option, and submit your ballot. You'll receive a confirmation once your vote is successfully recorded.",
      category: "voting"
    },
    {
      question: "Can I change my vote after submitting?",
      answer: "No, once you've submitted your vote, it cannot be changed or retracted. Please review your selections carefully before submitting your ballot.",
      category: "voting"
    },
    {
      question: "What happens if I lose internet connection while voting?",
      answer: "If you lose connection while voting, your vote will not be submitted. Once your connection is restored, you can try again. The system will only register your vote when you receive a confirmation message.",
      category: "technical"
    },
    {
      question: "How do I know my vote is secure and anonymous?",
      answer: "Our system uses encryption to ensure that all votes are secure. While the system records that you have participated in an election, your specific choices remain anonymous. Administrators can see who voted but cannot see individual voting choices.",
      category: "security"
    },
    {
      question: "When will election results be available?",
      answer: "Results are typically available after the election closing time. You can view results of completed elections in the 'Election Results' section. For some elections, results may be delayed if they require verification or manual counting.",
      category: "results"
    },
    {
      question: "What should I do if I'm eligible for an election but don't see it in my list?",
      answer: "If you believe you're eligible for an election but don't see it in your active elections, please contact the IT support team or election administrators immediately with your student ID and the election details.",
      category: "eligibility"
    },
    {
      question: "How do I update my account information?",
      answer: "You can update your profile information through the 'Account Settings' page. Note that some information like your student ID cannot be changed as it's linked to university records.",
      category: "account"
    }
  ];

  const filteredFaqs = searchQuery 
    ? faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()))
    : faqs;

  const toggleFaq = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  useEffect(() => {
    if (calendarModalOpen && elections.length === 0) {
      setCalendarLoading(true);
      apiClient.get('/elections')
        .then(res => setElections(res.data))
        .catch(() => setElections([]))
        .finally(() => setCalendarLoading(false));
    }
  }, [calendarModalOpen, elections.length]);

  useEffect(() => {
    if (supportModalOpen && user) {
      setSupportForm(f => ({
        ...f,
        name: `${user.first_name} ${user.last_name}`,
        email: user.student_email
      }));
    }
    if (!supportModalOpen) {
      setSupportResult(null);
      setSupportForm(f => ({ ...f, subject: '', message: '' }));
    }
  }, [supportModalOpen, user]);

  const handleSupportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSupportLoading(true);
    setSupportResult(null);
    try {
      await apiClient.post('/user/support-ticket', supportForm);
      setSupportResult('success');
      setSupportForm(f => ({ ...f, subject: '', message: '' }));
      setTimeout(() => {
        setSupportModalOpen(false);
        setSupportResult(null);
      }, 1800);
    } catch {
      setSupportResult('error');
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
        <p className="text-gray-600 mt-2">
          Find answers to common questions and get support for using the voting system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - FAQs and Vote Policy */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Frequently Asked Questions</h2>
            
            <div className="relative mb-6">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search FAQs..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-4">
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No results found. Try a different search term.</p>
                </div>
              ) : (
                filteredFaqs.map((faq, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      className="w-full text-left px-4 py-3 flex justify-between items-center hover:bg-gray-50 focus:outline-none"
                      onClick={() => toggleFaq(index)}
                    >
                      <span className="font-medium text-gray-800">{faq.question}</span>
                      {expandedIndex === index ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                    </button>
                    
                    {expandedIndex === index && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                        <p className="text-gray-700">{faq.answer}</p>
                        <div className="mt-2">
                          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">{faq.category}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 border border-gray-200 mt-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Vote Policy</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Each voter can vote only once per election.</li>
              <li>Each voter can select only one candidate per position.</li>
              <li>Votes are final and cannot be changed after submission.</li>
              <li>Voting is only allowed during the official election period.</li>
              <li>All votes are encrypted and anonymous.</li>
              <li>Attempting to vote multiple times or outside the allowed period is not permitted.</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">How to Vote</h2>
            <div className="space-y-4">
              <div className="flex">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 font-bold mr-3">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Find an active election</h3>
                  <p className="text-gray-600 mt-1">Navigate to the &quot;Cast Your Vote&quot; page from the sidebar to see all available elections.</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 font-bold mr-3">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Review the candidates or options</h3>
                  <p className="text-gray-600 mt-1">Click on an election to view all candidates or voting options available.</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 font-bold mr-3">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Make your selection</h3>
                  <p className="text-gray-600 mt-1">Select your preferred candidate(s) or option(s) according to the election rules.</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 font-bold mr-3">
                  4
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Review and submit</h3>
                  <p className="text-gray-600 mt-1">Review your selections carefully, then submit your ballot. Once submitted, you cannot change your vote.</p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 font-bold mr-3">
                  5
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Confirmation</h3>
                  <p className="text-gray-600 mt-1">You&apos;ll receive a confirmation that your vote was recorded successfully.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Contact and Support, Resources */}
        <div>
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Contact Support</h2>
            <p className="text-gray-600 mb-4">
              Need additional help? Our support team is available during business hours.
            </p>
            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-red-600 mr-2" />
                <a href="mailto:support@phoniphaleia.edu" className="text-blue-600 hover:underline">support@phoniphaleia.edu</a>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-red-600 mr-2" />
                <span>(123) 456-7890</span>
              </div>
              <button
                className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2"
                onClick={() => setSupportModalOpen(true)}
              >
                <MessageSquare size={16} /> Open Support Ticket
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Resources</h2>
            <div className="space-y-3">
              <button
                className="block w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                onClick={() => {}}
                disabled
              >
                <h3 className="font-medium text-gray-800">Voting Policy</h3>
                <p className="text-sm text-gray-600">See the voting policy section below.</p>
              </button>
              <button
                className="block w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                onClick={() => setVideoModalOpen(true)}
              >
                <h3 className="font-medium text-gray-800">Video Tutorials</h3>
                <p className="text-sm text-gray-600">Watch step-by-step guides on using the voting system.</p>
              </button>
              <button
                className="block w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                onClick={() => setCalendarModalOpen(true)}
              >
                <h3 className="font-medium text-gray-800">Election Calendar</h3>
                <p className="text-sm text-gray-600">View upcoming and scheduled elections for the year.</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Support Ticket Modal */}
      <Modal isOpen={supportModalOpen} onClose={() => { setSupportModalOpen(false); setSupportResult(null); }} title="Open Support Ticket" size="md">
        <form onSubmit={handleSupportSubmit} className="space-y-4">
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
            placeholder="Your Name"
            value={supportForm.name}
            readOnly
            required
          />
          <input
            type="email"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
            placeholder="Your Email"
            value={supportForm.email}
            readOnly
            required
          />
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Subject"
            value={supportForm.subject}
            onChange={e => setSupportForm(f => ({ ...f, subject: e.target.value }))}
            required
          />
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Describe your issue or question..."
            value={supportForm.message}
            onChange={e => setSupportForm(f => ({ ...f, message: e.target.value }))}
            rows={4}
            required
          />
          {supportResult === 'success' && (
            <div className="text-green-700 text-center text-sm font-semibold flex items-center justify-center gap-2">
              <span>✅ Support ticket sent! We will contact you soon.</span>
            </div>
          )}
          {supportResult === 'error' && (
            <div className="text-red-600 text-center text-sm font-semibold flex items-center justify-center gap-2">
              <span>❌ Failed to submit support ticket. Please try again later.</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 rounded-lg border" onClick={() => setSupportModalOpen(false)} disabled={supportLoading}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white" disabled={supportLoading || supportResult === 'success'}>{supportLoading ? 'Submitting...' : 'Submit Ticket'}</button>
          </div>
        </form>
      </Modal>

      {/* Video Tutorials Modal */}
      <Modal isOpen={videoModalOpen} onClose={() => setVideoModalOpen(false)} title="Video Tutorials" size="sm">
        <div className="text-center py-6">
          <p className="text-lg text-gray-700">Video tutorials are still in the works. Stay tuned!</p>
        </div>
      </Modal>

      {/* Election Calendar Modal */}
      <Modal isOpen={calendarModalOpen} onClose={() => setCalendarModalOpen(false)} title="Election Calendar" size="xxl">
        <div className="py-2">
          {calendarLoading ? (
            <div className="text-center text-gray-500">Loading elections...</div>
          ) : (
            <CalendarView elections={elections} />
          )}
        </div>
      </Modal>
    </UserLayout>
  );
}