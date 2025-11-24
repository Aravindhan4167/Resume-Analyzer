import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Dashboard = ({ session }) => {
    // State for roles
    const [roles, setRoles] = useState([]);

    // State for the upload form
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [file, setFile] = useState(null);
    const [uploadRole, setUploadRole] = useState('');
    
    // State for the displayed resume list and filter
    const [resumes, setResumes] = useState([]);
    const [filterRole, setFilterRole] = useState('');
    const [fetching, setFetching] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    
    // State for showing the analysis of a specific resume
    const [analysisResult, setAnalysisResult] = useState(null);

    // Fetch available roles from the backend
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("User not authenticated.");
                const token = session.access_token;

                const response = await fetch('http://localhost:3001/api/roles', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Could not fetch roles.');
                
                const data = await response.json();
                setRoles(data);
                if (data.length > 0) {
                    setUploadRole(data[0].name); // Set default role for upload
                }
            } catch (error) {
                setFetchError('Could not load roles from the server.');
            }
        };
        fetchRoles();
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setUploadError(null);
        }
    };

    const fetchResumes = useCallback(async () => {
        setFetching(true);
        setFetchError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("User not authenticated.");
            const token = session.access_token;
            
            let url = 'http://localhost:3001/api/resumes';
            if (filterRole) {
                url += `?role=${encodeURIComponent(filterRole)}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to fetch resumes.');
            }
            const data = await response.json();
            setResumes(data);
        } catch (err) {
            setFetchError(err.message);
        } finally {
            setFetching(false);
        }
    }, [filterRole]);

    useEffect(() => {
        fetchResumes();
    }, [fetchResumes]);

    const handleUpload = async () => {
        if (!file) {
            setUploadError('Please select a file to upload.');
            return;
        }
        if (!uploadRole) {
            setUploadError('Please select a role.');
            return;
        }

        setUploading(true);
        setUploadError(null);
        setAnalysisResult(null);

        const formData = new FormData();
        formData.append('resume', file);
        formData.append('role', uploadRole);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("User not authenticated.");
            const token = session.access_token;
            
            const response = await fetch('http://localhost:3001/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            
            setAnalysisResult(result.data.analysis);
            fetchResumes(); 
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <h2 className="mb-3">Resume Dashboard</h2>
            <p className="mb-4">Welcome, {session.user.email}!</p>

            <div className="card bg-light mb-4">
                <div className="card-body">
                    <h5 className="card-title">Upload New Resume</h5>
                     <div className="row g-3">
                        <div className="col-md-6">
                            <label htmlFor="resumeFile" className="form-label">Resume PDF File</label>
                            <input className="form-control" type="file" id="resumeFile" accept=".pdf" onChange={handleFileChange} />
                        </div>
                        <div className="col-md-6">
                            <label htmlFor="roleSelect" className="form-label">Select Role</label>
                            <select id="roleSelect" className="form-select" value={uploadRole} onChange={(e) => setUploadRole(e.target.value)}>
                                {roles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <button className="btn btn-primary mt-3" onClick={handleUpload} disabled={uploading || !file}>
                        {uploading ? 'Analyzing...' : 'Upload and Analyze'}
                    </button>
                    {uploadError && <div className="alert alert-danger mt-3">{uploadError}</div>}
                </div>
            </div>

            {analysisResult && (
                <div className="card mt-4">
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <h5>Analysis Results</h5>
                        <button type="button" className="btn-close" aria-label="Close" onClick={() => setAnalysisResult(null)}></button>
                    </div>
                    <div className="card-body">
                        <h3 className="mb-4">Final Result: 
                            <span className={`ms-2 badge ${analysisResult.finalResult === 'Accepted' ? 'bg-success' : 'bg-danger'}`}>
                                {analysisResult.finalResult}
                            </span>
                        </h3>
                        <p><strong>Word Count:</strong> {analysisResult.wordCount}</p>
                        <p className="mb-1"><strong>Keywords Found ({analysisResult.foundKeywords?.length} / {analysisResult.expectedKeywords?.length}):</strong></p>
                        {analysisResult.expectedKeywords?.length > 0 ? (
                             <ul className="list-group list-group-flush">
                                {analysisResult.expectedKeywords.map(kw => (
                                    <li key={kw} className={`list-group-item py-1 ${analysisResult.foundKeywords?.includes(kw) ? 'text-success' : 'text-danger'}`}>
                                        {analysisResult.foundKeywords?.includes(kw) ? '✓' : '✗'} {kw}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted">No specific keywords expected for this role.</p>
                        )}
                       
                        <h6 className="mt-3">Text Snippet:</h6>
                        <p className="text-muted" style={{ fontSize: '0.9rem' }}>{analysisResult.fullText}</p>
                    </div>
                </div>
            )}
            
            <hr className="my-5" />

            <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className='mb-0'>Your Resumes</h4>
                    <div className="col-4">
                        <select className="form-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                            <option value="">Filter by All Roles</option>
                            {roles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
                        </select>
                    </div>
                </div>
                {fetching && <p>Loading resumes...</p>}
                {fetchError && <div className="alert alert-warning">{fetchError}</div>}
                {!fetching && !fetchError && (
                    <ul className="list-group">
                        {resumes.length > 0 ? resumes.map(resume => (
                            <li key={resume._id} className="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <strong className="d-block">{resume.file_name}</strong>
                                    <span className="badge bg-secondary">{resume.role}</span>
                                    {resume.analysis?.finalResult && (
                                        <span className={`badge ms-2 ${resume.analysis.finalResult === 'Accepted' ? 'bg-success' : 'bg-danger'}`}>
                                            {resume.analysis.finalResult}
                                        </span>
                                    )}
                                </div>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => setAnalysisResult(resume.analysis)}>
                                    View Analysis
                                </button>
                            </li>
                        )) : <li className="list-group-item">No resumes found.</li>}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
