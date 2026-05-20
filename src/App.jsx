import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDGs4BhFI-S1Eknrh2SHw35ZOhS_dbh5Mc",
  authDomain: "jobtracker-rce.firebaseapp.com",
  projectId: "jobtracker-rce",
  storageBucket: "jobtracker-rce.firebasestorage.app",
  messagingSenderId: "802093486888",
  appId: "1:802093486888:web:f5e977969412a9cfb0361d",
  measurementId: "G-Q7287R3SYJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const STAGES = ['Applied', 'CV Downloaded', 'Viewed', 'Interviewing', 'Offer', 'Rejected', 'Closed', 'Withdrawn', 'Ghosted'];
const SOURCES = ['Jobstreet', 'Whatsapp', 'LinkedIn', 'Email', 'Company Site'];

export default function App() {
  const [applications, setApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const appsRef = collection(db, 'applications');
    
    const unsubscribe = onSnapshot(appsRef, (snapshot) => {
      const loadedApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(loadedApps.sort((a, b) => new Date(b.date) - new Date(a.date)));
    }, (error) => {
      console.error("Gagal menarik data:", error);
    });

    return () => unsubscribe();
  }, []);

  const metrics = useMemo(() => {
    const total = applications.length;
    const contacts = applications.filter(a => ['Viewed', 'CV Downloaded', 'Interviewing', 'Offer', 'Rejected'].includes(a.stage) && a.source !== 'Rejected (No Contact)').length;
    const interviews = applications.filter(a => ['Interviewing', 'Offer'].includes(a.stage)).length;
    const offers = applications.filter(a => a.stage === 'Offer').length;
    return { total, contacts, interviews, offers };
  }, [applications]);

  const sourceStats = useMemo(() => {
    return SOURCES.map(source => {
      const sourceApps = applications.filter(a => a.source === source);
      const total = sourceApps.length;
      const interviews = sourceApps.filter(a => ['Interviewing', 'Offer'].includes(a.stage)).length;
      
      const appsWithInterviewDates = sourceApps.filter(a => a.date && a.interviewDate);
      let avgDays = 0;
      if (appsWithInterviewDates.length > 0) {
        const totalDays = appsWithInterviewDates.reduce((sum, app) => {
          const diffTime = Math.abs(new Date(app.interviewDate) - new Date(app.date));
          return sum + Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }, 0);
        avgDays = Math.round(totalDays / appsWithInterviewDates.length);
      }

      return { 
        source, 
        total, 
        interviews, 
        conversion: total > 0 ? Math.round((interviews / total) * 100) : 0,
        avgDays
      };
    }).filter(s => s.total > 0).sort((a, b) => b.conversion - a.conversion);
  }, [applications]);

  const filteredApps = applications.filter(app => 
    app?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app?.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStageColor = (stage) => {
    switch(stage) {
      case 'Applied': return 'bg-gray-100 text-gray-800';
      case 'CV Downloaded': return 'bg-blue-50 text-blue-700';
      case 'Viewed': return 'bg-blue-100 text-blue-800';
      case 'Interviewing': return 'bg-yellow-100 text-yellow-800';
      case 'Offer': return 'bg-green-100 text-green-800 font-medium';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Closed': return 'bg-slate-300 text-slate-700';
      case 'Withdrawn': return 'bg-slate-200 text-slate-600';
      case 'Ghosted': return 'bg-slate-200 text-slate-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const updateAppInDb = async (id, dataToUpdate) => {
    const docRef = doc(db, 'applications', id.toString());
    await setDoc(docRef, dataToUpdate, { merge: true });
  };

  const handleStageChange = (id, newStage) => {
    const app = applications.find(a => a.id === id);
    const nextAction = ['Rejected', 'Withdrawn', 'Ghosted', 'Offer', 'Closed'].includes(newStage) ? '' : app.nextAction;
    updateAppInDb(id, { stage: newStage, nextAction });
  };

  const handleFieldChange = (id, field, value) => {
    updateAppInDb(id, { [field]: value });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus data lamaran ini?')) {
      await deleteDoc(doc(db, 'applications', id.toString()));
    }
  };

  const handleAddApplication = async () => {
    const newId = Date.now().toString();
    const newApp = {
      date: new Date().toISOString().split('T')[0],
      company: '',
      position: '',
      source: 'Jobstreet',
      stage: 'Applied',
      nextAction: '',
      interviewDate: '',
      location: '',
      contact: '',
      note: ''
    };
    
    const docRef = doc(db, 'applications', newId);
    await setDoc(docRef, newApp);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 font-sans text-sm">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">Pipeline Tracker</h1>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
              <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Total Lamaran</div>
              <div className="text-3xl font-bold text-gray-900">{metrics.total}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-md border border-blue-100">
              <div className="text-blue-600 text-xs font-medium uppercase tracking-wider mb-1">Kontak Dibuat</div>
              <div className="text-3xl font-bold text-blue-900">{metrics.contacts}</div>
              <div className="text-blue-500 text-xs mt-1">{Math.round((metrics.contacts/metrics.total)*100 || 0)}% rasio</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-md border border-yellow-100">
              <div className="text-yellow-600 text-xs font-medium uppercase tracking-wider mb-1">Interview</div>
              <div className="text-3xl font-bold text-yellow-900">{metrics.interviews}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-md border border-green-100">
              <div className="text-green-600 text-xs font-medium uppercase tracking-wider mb-1">Penawaran</div>
              <div className="text-3xl font-bold text-green-900">{metrics.offers}</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Performa Sumber Lamaran</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sourceStats.map(stat => (
                <div key={stat.source} className="bg-gray-50 border border-gray-200 rounded-md p-4 flex flex-col">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">{stat.source}</div>
                  <div className="flex items-end justify-between mt-2">
                    <div className="text-2xl font-bold text-gray-900">{stat.conversion}%</div>
                    <div className="text-xs text-gray-500 mb-1">{stat.interviews} dari {stat.total} lamaran</div>
                  </div>
                  {stat.interviews > 0 && (
                    <div className="text-xs text-blue-600 mt-3 font-medium bg-blue-50 py-1 px-2 rounded inline-block w-fit">
                      ⏱ Rata-rata {stat.avgDays} hari ke interview
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <input 
              type="text"
              placeholder="Cari perusahaan atau posisi..."
              className="px-3 py-2 border border-gray-300 rounded-md w-full md:w-72 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button 
              onClick={handleAddApplication}
              className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors w-full md:w-auto"
            >
              + Lamaran Baru
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1250px]">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="p-3 font-medium w-32">Tgl Apply</th>
                  <th className="p-3 font-medium w-48">Perusahaan</th>
                  <th className="p-3 font-medium w-48">Posisi</th>
                  <th className="p-3 font-medium w-32">Lokasi</th>
                  <th className="p-3 font-medium w-40">Kontak/Email</th>
                  <th className="p-3 font-medium w-32">Sumber</th>
                  <th className="p-3 font-medium w-40">Status</th>
                  <th className="p-3 font-medium w-32">Tgl Interview</th>
                  <th className="p-3 font-medium w-32">Next Action</th>
                  <th className="p-3 font-medium">Catatan</th>
                  <th className="p-3 font-medium w-12 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 group">
                    <td className="p-3">
                      <input 
                        type="date" 
                        value={app.date || ''}
                        onChange={(e) => handleFieldChange(app.id, 'date', e.target.value)}
                        className="px-2 py-1 w-full border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-gray-500 bg-transparent text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={app.company || ''}
                        onChange={(e) => handleFieldChange(app.id, 'company', e.target.value)}
                        placeholder="Perusahaan"
                        className="px-2 py-1 w-full font-medium border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-gray-900 bg-transparent text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={app.position || ''}
                        onChange={(e) => handleFieldChange(app.id, 'position', e.target.value)}
                        placeholder="Posisi"
                        className="px-2 py-1 w-full border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-gray-700 bg-transparent text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={app.location || ''}
                        onChange={(e) => handleFieldChange(app.id, 'location', e.target.value)}
                        placeholder="Lokasi"
                        className="px-2 py-1 w-full border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-gray-700 bg-transparent text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={app.contact || ''}
                        onChange={(e) => handleFieldChange(app.id, 'contact', e.target.value)}
                        placeholder="Email/No HP"
                        className="px-2 py-1 w-full border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-gray-700 bg-transparent text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <select 
                        value={app.source}
                        onChange={(e) => handleFieldChange(app.id, 'source', e.target.value)}
                        className="px-2 py-1 w-full border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-gray-600 bg-transparent text-sm"
                      >
                        {SOURCES.map(source => (
                          <option key={source} value={source}>{source}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <select 
                        value={app.stage}
                        onChange={(e) => handleStageChange(app.id, e.target.value)}
                        className={`px-2 py-1 w-full text-xs font-semibold rounded-full border-none cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 appearance-none text-center ${getStageColor(app.stage)}`}
                      >
                        {STAGES.map(stage => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <input 
                        type="date" 
                        value={app.interviewDate || ''}
                        onChange={(e) => handleFieldChange(app.id, 'interviewDate', e.target.value)}
                        disabled={!['Interviewing', 'Offer'].includes(app.stage)}
                        className="px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-gray-700 bg-transparent disabled:opacity-30 disabled:hover:border-transparent w-full"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="date" 
                        value={app.nextAction || ''}
                        onChange={(e) => handleFieldChange(app.id, 'nextAction', e.target.value)}
                        disabled={['Rejected', 'Withdrawn', 'Ghosted', 'Offer', 'Closed'].includes(app.stage)}
                        className="px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-gray-700 bg-transparent disabled:opacity-30 disabled:hover:border-transparent w-full"
                      />
                    </td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        value={app.note || ''}
                        onChange={(e) => handleFieldChange(app.id, 'note', e.target.value)}
                        placeholder="Catatan..."
                        className="px-2 py-1 w-full border border-transparent hover:border-gray-300 focus:border-blue-500 rounded text-gray-600 bg-transparent text-sm"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleDelete(app.id)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                        title="Hapus lamaran"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {applications.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Database masih kosong. Klik "Lamaran Baru" untuk mulai.
            </div>
          )}
          
          {applications.length > 0 && filteredApps.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Tidak ada lamaran yang sesuai kriteria pencarian.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}