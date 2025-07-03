import { useState, useEffect, useRef } from 'react';

interface UseSpeakingDetectionProps {
  stream?: MediaStream | null;
  threshold?: number;
  sensitivity?: number;
}

export const useSpeakingDetection = ({ 
  stream, 
  threshold = 30, 
  sensitivity = 0.8 
}: UseSpeakingDetectionProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setIsSpeaking(false);
      return;
    }

    const setupAudioAnalysis = async () => {
      try {
        // Create AudioContext
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioContext = audioContextRef.current;

        // Create analyser
        analyserRef.current = audioContext.createAnalyser();
        const analyser = analyserRef.current;
        
        analyser.smoothingTimeConstant = sensitivity;
        analyser.fftSize = 1024;

        // Connect microphone to analyser
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        // Start monitoring audio levels
        const checkAudioLevel = () => {
          if (!analyser) return;

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(dataArray);

          // Calculate average volume
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          
          // Determine if speaking based on threshold
          const speaking = average > threshold;
          setIsSpeaking(speaking);

          // Continue monitoring
          animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
        setIsSpeaking(false);
      }
    };

    setupAudioAnalysis();

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      setIsSpeaking(false);
    };
  }, [stream, threshold, sensitivity]);

  return { isSpeaking };
};

export default useSpeakingDetection;
