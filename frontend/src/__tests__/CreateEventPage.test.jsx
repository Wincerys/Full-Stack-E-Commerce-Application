import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CreateEventPage from '../src/pages/CreateEventPage';
import * as api from '../src/services/api';

// Mock the API module
vi.mock('../src/services/api', () => ({
  createEvent: vi.fn(),
  listCategories: vi.fn(),
  uploadPhotos: vi.fn(),
  isAuthed: vi.fn()
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('CreateEventPage', () => {
  let queryClient;

  const renderComponent = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CreateEventPage />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.listCategories.mockResolvedValue(['Technology', 'Sports', 'Social']);
  });

  it('should show login prompt when user is not authenticated', () => {
    api.isAuthed.mockReturnValue(false);
    
    renderComponent();
    
    expect(screen.getByText('Please')).toBeInTheDocument();
    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.getByText('to create events.')).toBeInTheDocument();
  });

  it('should render create event form when user is authenticated', async () => {
    api.isAuthed.mockReturnValue(true);
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Create Event')).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date & time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });
  });

  it('should display validation error when required fields are missing', async () => {
    api.isAuthed.mockReturnValue(true);
    
    renderComponent();
    
    const submitButton = await screen.findByText('Create Event');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please fill title, date & time, location, and category/i))
        .toBeInTheDocument();
    });
  });

  it('should call createEvent API when form is submitted with valid data', async () => {
    api.isAuthed.mockReturnValue(true);
    api.createEvent.mockResolvedValue({ id: 'test-id' });
    
    renderComponent();
    
    // Fill out the form
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/title/i), {
        target: { value: 'Test Event' }
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: 'Test Description' }
      });
      fireEvent.change(screen.getByLabelText(/date & time/i), {
        target: { value: '2024-12-25T14:00' }
      });
      fireEvent.change(screen.getByLabelText(/location/i), {
        target: { value: 'Test Location' }
      });
      
      // Select existing category
      const categorySelect = screen.getByRole('combobox');
      fireEvent.change(categorySelect, { target: { value: 'Technology' } });
    });
    
    const submitButton = screen.getByText('Create Event');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(api.createEvent).toHaveBeenCalledWith({
        title: 'Test Event',
        description: 'Test Description',
        dateTimeISO: '2024-12-25T14:00',
        location: 'Test Location',
        category: 'Technology'
      });
      expect(mockNavigate).toHaveBeenCalledWith('/events/test-id');
    });
  });

  it('should handle photo file selection', async () => {
    api.isAuthed.mockReturnValue(true);
    
    renderComponent();
    
    const fileInput = await screen.findByRole('button', { name: /choose files/i });
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('1 file(s) selected')).toBeInTheDocument();
    });
  });

  it('should validate file types and show error for invalid files', async () => {
    api.isAuthed.mockReturnValue(true);
    
    renderComponent();
    
    // Fill required fields
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/title/i), {
        target: { value: 'Test Event' }
      });
      fireEvent.change(screen.getByLabelText(/date & time/i), {
        target: { value: '2024-12-25T14:00' }
      });
      fireEvent.change(screen.getByLabelText(/location/i), {
        target: { value: 'Test Location' }
      });
      
      const categorySelect = screen.getByRole('combobox');
      fireEvent.change(categorySelect, { target: { value: 'Technology' } });
    });
    
    // Add invalid file type
    const fileInput = screen.getByRole('button', { name: /choose files/i });
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    
    const submitButton = screen.getByText('Create Event');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Only JPEG/PNG allowed.')).toBeInTheDocument();
    });
  });

  it('should switch between existing and new category modes', async () => {
    api.isAuthed.mockReturnValue(true);
    
    renderComponent();
    
    await waitFor(() => {
      const createNewButton = screen.getByText('Create new');
      fireEvent.click(createNewButton);
      
      expect(screen.getByPlaceholderText(/e.g., Campus, Tech, Social/i))
        .toBeInTheDocument();
      expect(screen.getByText('Choose existing')).toBeInTheDocument();
    });
    
    const chooseExistingButton = screen.getByText('Choose existing');
    fireEvent.click(chooseExistingButton);
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    api.isAuthed.mockReturnValue(true);
    api.createEvent.mockRejectedValue(new Error('Server error'));
    
    renderComponent();
    
    // Fill out valid form
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/title/i), {
        target: { value: 'Test Event' }
      });
      fireEvent.change(screen.getByLabelText(/date & time/i), {
        target: { value: '2024-12-25T14:00' }
      });
      fireEvent.change(screen.getByLabelText(/location/i), {
        target: { value: 'Test Location' }
      });
      
      const categorySelect = screen.getByRole('combobox');
      fireEvent.change(categorySelect, { target: { value: 'Technology' } });
    });
    
    const submitButton = screen.getByText('Create Event');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('should upload photos after creating event successfully', async () => {
    api.isAuthed.mockReturnValue(true);
    api.createEvent.mockResolvedValue({ id: 'test-id' });
    api.uploadPhotos.mockResolvedValue({});
    
    renderComponent();
    
    // Fill form and add file
    await waitFor(() => {
      fireEvent.change(screen.getByLabelText(/title/i), {
        target: { value: 'Test Event' }
      });
      fireEvent.change(screen.getByLabelText(/date & time/i), {
        target: { value: '2024-12-25T14:00' }
      });
      fireEvent.change(screen.getByLabelText(/location/i), {
        target: { value: 'Test Location' }
      });
      
      const categorySelect = screen.getByRole('combobox');
      fireEvent.change(categorySelect, { target: { value: 'Technology' } });
      
      const fileInput = screen.getByRole('button', { name: /choose files/i });
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });
    });
    
    const submitButton = screen.getByText('Create Event');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(api.createEvent).toHaveBeenCalled();
      expect(api.uploadPhotos).toHaveBeenCalledWith('test-id', expect.any(Array));
      expect(mockNavigate).toHaveBeenCalledWith('/events/test-id');
    });
  });
});