'use client';
import { useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { ChevronDown, ChevronUp, Search, Mail, Phone, MessageSquare } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export default function UserHelpPage() {
  useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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

  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
        <p className="text-gray-600 mt-2">
          Find answers to common questions and get support for using the voting system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - FAQs */}
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
        
        {/* Right side - Contact and Support */}
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
              <button className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2">
                <MessageSquare size={16} /> Open Support Ticket
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Resources</h2>
            <div className="space-y-3">
              <a href="#" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                <h3 className="font-medium text-gray-800">Voting Policy</h3>
                <p className="text-sm text-gray-600">Read the official university voting policy and guidelines.</p>
              </a>
              <a href="#" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                <h3 className="font-medium text-gray-800">Video Tutorials</h3>
                <p className="text-sm text-gray-600">Watch step-by-step guides on using the voting system.</p>
              </a>
              <a href="#" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                <h3 className="font-medium text-gray-800">Election Calendar</h3>
                <p className="text-sm text-gray-600">View upcoming and scheduled elections for the year.</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}