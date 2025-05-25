// Documentation API service
import apiService from './apiService';

export interface Documentation {
  doc_id: number;
  title: string;
  category: string;
  status: 'Published' | 'Draft' | 'Archived';
  description?: string;
  content?: string;
  author: string;
  published_at: string | null;
  last_updated?: string | null;
  created_at?: string;
}

export interface CreateDocumentationRequest {
  title: string;
  category: string;
  status: 'Published' | 'Draft' | 'Archived';
  description?: string;
  content?: string;
  author: string;
  [key: string]: unknown;
}

export interface DocumentationResponse {
  status: string;
  data: Documentation[] | Documentation;
  message?: string;
}

/**
 * Fetch all documentation with optional filtering
 */
export const getAllDocumentation = async (
  status?: string,
  category?: string,
  search?: string,
  sort?: string
): Promise<Documentation[]> => {
  // Build query string from parameters
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (category && category !== 'ALL') params.append('category', category);
  if (search) params.append('search', search);
  if (sort) params.append('sort', sort);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  try {
    const response = await apiService.authenticatedGet<DocumentationResponse>(`/documentation${queryString}`);
    
    if (response.status === 'success' && Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching documentation:', error);
    throw error;
  }
};

/**
 * Fetch a single documentation by ID
 */
export const getDocumentationById = async (docId: number): Promise<Documentation | null> => {
  try {
    const response = await apiService.authenticatedGet<DocumentationResponse>(`/documentation/${docId}`);
    
    if (response.status === 'success' && !Array.isArray(response.data)) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching documentation with ID ${docId}:`, error);
    throw error;
  }
};

/**
 * Create a new documentation
 */
export const createDocumentation = async (data: CreateDocumentationRequest): Promise<Documentation> => {
  try {
    const response = await apiService.authenticatedPost<DocumentationResponse>('/documentation', data);
    
    if (response.status === 'success' && !Array.isArray(response.data)) {
      return response.data;
    }
    
    throw new Error(response.message || 'Failed to create documentation');
  } catch (error) {
    console.error('Error creating documentation:', error);
    throw error;
  }
};

/**
 * Update an existing documentation
 */
export const updateDocumentation = async (docId: number, data: Partial<Documentation>): Promise<Documentation> => {
  try {
    const response = await apiService.authenticatedFetch(`/documentation/${docId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update documentation with status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success' && !Array.isArray(result.data)) {
      return result.data;
    }
    
    throw new Error(result.message || 'Failed to update documentation');
  } catch (error) {
    console.error(`Error updating documentation with ID ${docId}:`, error);
    throw error;
  }
};

/**
 * Delete a documentation
 */
export const deleteDocumentation = async (docId: number): Promise<boolean> => {
  try {
    const response = await apiService.authenticatedFetch(`/documentation/${docId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete documentation with status ${response.status}`);
    }
    
    const result = await response.json();
    
    return result.status === 'success';
  } catch (error) {
    console.error(`Error deleting documentation with ID ${docId}:`, error);
    throw error;
  }
};

const documentationService = {
  getAllDocumentation,
  getDocumentationById,
  createDocumentation,
  updateDocumentation,
  deleteDocumentation
};

export default documentationService;
