'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/layouts/AdminLayout';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Edit, Trash, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

// Import documentation service
import documentationService, { Documentation } from '@/services/documentationService';

// Import components
import PageHeader from '@/components/admin/PageHeader';

export default function ViewDocumentationPage() {
  const router = useRouter();
  const params = useParams();
  const docId = parseInt(params.id as string, 10);
  
  const [doc, setDoc] = useState<Documentation | null>(null);
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
        const document = await documentationService.getDocumentationById(docId);
        if (document) {
          setDoc(document);
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

  // Function to handle document deletion
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }
    
    try {
      const success = await documentationService.deleteDocumentation(docId);
      if (success) {
        toast.success('Document deleted successfully');
        router.push('/admin/help-documentation');
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Published':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Published</span>;
      case 'Draft':
        return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">Draft</span>;
      case 'Archived':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Archived</span>;
      default:
        return null;
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
          title="View Document" 
          action={backButton}
        />
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading document...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!doc) {
    return (
      <AdminLayout>
        <PageHeader 
          title="Document Not Found" 
          action={backButton}
        />
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">The requested document could not be found.</p>
          <Link href="/admin/help-documentation">
            <button className="mt-4 px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700">
              Return to Documentation
            </button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader 
        title={doc.title}
        action={backButton}
      />
      
      <div className="bg-white rounded-lg shadow overflow-hidden max-w-4xl mx-auto">
        {/* Document header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-blue-600">{doc.category}</span>
                {getStatusBadge(doc.status)}
              </div>
              <h1 className="text-2xl font-semibold text-gray-800">{doc.title}</h1>
              {doc.description && (
                <p className="mt-2 text-gray-600">{doc.description}</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Link href={`/admin/help-documentation/${doc.doc_id}/edit`}>
                <button 
                  className="p-2 text-amber-600 hover:bg-amber-50 rounded-full"
                  disabled={doc.status === 'Archived'}
                >
                  <Edit size={18} />
                </button>
              </Link>
              <button 
                className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                onClick={handleDelete}
              >
                <Trash size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4 text-sm text-gray-500">            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>
                Published: {doc.published_at ? new Date(doc.published_at).toLocaleDateString() : 'Not published'}
                {doc.last_updated && doc.last_updated !== doc.published_at && 
                  ` (Updated: ${new Date(doc.last_updated).toLocaleDateString()})`}
              </span>
            </div>
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              <span>By {doc.author}</span>
            </div>
          </div>
        </div>
        
        {/* Document content */}
        <div className="p-6">
          {doc.content ? (
            <div className="prose max-w-none text-gray-600">
              {doc.content.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No content available.</p>
          )}
        </div>
        
        {/* Actions footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <Link href={`/admin/help-documentation/${doc.doc_id}/edit`}>
            <button 
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 mr-2"
              disabled={doc.status === 'Archived'}
            >
              Edit Document
            </button>
          </Link>
          <button 
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            onClick={handleDelete}
          >
            Delete Document
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
