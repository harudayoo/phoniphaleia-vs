'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/layouts/AdminLayout';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Import documentation service
import documentationService, { Documentation } from '@/services/documentationService';

// Import components
import PageHeader from '@/components/admin/PageHeader';

const categoryOptions = [
  { value: 'General', label: 'General' },
  { value: 'Voters', label: 'Voters' },
  { value: 'Elections', label: 'Elections' },
  { value: 'Results', label: 'Results' },
  { value: 'Security', label: 'Security' },
  { value: 'Technical', label: 'Technical' },
  { value: 'FAQ', label: 'FAQ' }
];

const statusOptions = [
  { value: 'Published', label: 'Published' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Archived', label: 'Archived' }
];

export default function EditDocumentationPage() {
  const router = useRouter();
  const params = useParams();
  const docId = parseInt(params.id as string, 10);
  
  const [formData, setFormData] = useState<Partial<Documentation>>({
    title: '',
    category: 'General',
    status: 'Draft',
    description: '',
    content: '',
    author: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch document data
  useEffect(() => {
    const fetchDocument = async () => {
      if (isNaN(docId)) {
        toast.error('Invalid document ID');
        router.push('/admin/help-documentation');
        return;
      }
      
      try {
        const doc = await documentationService.getDocumentationById(docId);
        if (doc) {
          setFormData({
            title: doc.title,
            category: doc.category,
            status: doc.status,
            description: doc.description || '',
            content: doc.content || '',
            author: doc.author
          });
        } else {
          toast.error('Document not found');
          router.push('/admin/help-documentation');
        }
      } catch (error) {
        console.error('Error fetching document:', error);
        toast.error('Failed to load document');
        router.push('/admin/help-documentation');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocument();
  }, [docId, router]);

  // Function to handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title?.trim()) {
      toast.error('Title is required');
      return;
    }
    
    if (!formData.author?.trim()) {
      toast.error('Author is required');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await documentationService.updateDocumentation(docId, formData);
      toast.success('Document updated successfully');
      router.push('/admin/help-documentation');
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
    } finally {
      setSubmitting(false);
    }
  };

  // Back button for header
  const backButton = (
    <Link href="/admin/help-documentation">
      <button className="flex items-center text-gray-600 hover:text-gray-900">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Documents
      </button>
    </Link>
  );

  if (loading) {
    return (
      <AdminLayout>
        <PageHeader 
          title="Edit Document" 
          action={backButton}
        />
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading document...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader 
        title={`Edit Document: ${formData.title}`} 
        action={backButton}
      />
      
      <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            {/* Category and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Author */}
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
                Author <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleChange}
                className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={10}
                className="w-full px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                You can use Markdown formatting in the content.
              </p>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/admin/help-documentation')}
                className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-red-800 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
