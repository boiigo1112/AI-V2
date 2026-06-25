import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { installApi } from '../services/install';
import Welcome from './Install/Welcome';
import DatabaseConnect from './Install/DatabaseConnect';
import ColumnMapping from './Install/ColumnMapping';
import AdminSetup from './Install/AdminSetup';
import Complete from './Install/Complete';

const steps = ['Welcome', 'Database', 'Mapping', 'Admin', 'Complete'];

function InstallWizard() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanData, setScanData] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    installApi.status()
      .then((res) => {
        if (res.data.installed) {
          setStep(steps.length);
          setLoading(false);
          return;
        }

        if (res.data.step > 0) {
          setStep(Math.min(res.data.step, steps.length - 1));
          if (res.data.step >= 2) {
            setResumeLoading(true);
            installApi.pending()
              .then((r) => {
                if (r.data.has_connection) {
                  setScanData(r.data);
                }
              })
              .catch((err) => {
                toast.error(err.response?.data?.error || 'ไม่สามารถโหลดข้อมูลการตั้งค่า');
              })
              .finally(() => {
                setLoading(false);
                setResumeLoading(false);
              });
            return;
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-border border-t-primary rounded-full"
        />
        {resumeLoading && (
          <p className="text-sm text-muted">กำลังโหลดข้อมูลการตั้งค่า...</p>
        )}
      </div>
    );
  }

  if (step >= steps.length) {
    return <Navigate to="/login" replace />;
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return <Welcome onNext={() => setStep(1)} />;
      case 1:
        return (
          <DatabaseConnect
            initialData={scanData}
            onNext={(data) => { setScanData(data); setStep(2); }}
            onBack={() => setStep(0)}
          />
        );
      case 2:
        return (
          <ColumnMapping
            data={scanData}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        );
      case 3:
        return (
          <AdminSetup
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        );
      case 4:
        return <Complete data={scanData} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#0f0f23] to-[#0a0a2e]">
      <div className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
          {steps.slice(0, -1).map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i <= step ? 'bg-primary text-white' : 'bg-hover text-muted'
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i <= step ? 'text-text' : 'text-muted'}`}>
                {s}
              </span>
              {i < steps.length - 2 && <div className={`w-8 h-0.5 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-3xl pt-20">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default InstallWizard;
