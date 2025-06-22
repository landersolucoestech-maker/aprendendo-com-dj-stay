
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface VideoTestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  testimonialName: string;
  testimonialRole: string;
}

const VideoTestimonialModal = ({ 
  isOpen, 
  onClose, 
  testimonialName, 
  testimonialRole 
}: VideoTestimonialModalProps) => {
  console.log("Modal state:", { isOpen, testimonialName, testimonialRole });
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log("Dialog onOpenChange called with:", open);
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-4xl bg-black/95 border-brand-light/20">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            Depoimento de {testimonialName}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Assista ao depoimento completo de {testimonialName} sobre sua experiência no curso
          </DialogDescription>
        </DialogHeader>
        
        <div className="aspect-video bg-gradient-brand rounded-lg flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-black/50"></div>
          <Button 
            size="lg" 
            className="relative z-10 bg-white/20 hover:bg-white/30 text-white border-white/30"
            onClick={() => console.log("Play button clicked")}
          >
            <Play className="w-8 h-8" />
          </Button>
          
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black/60 rounded px-3 py-2 text-left">
              <p className="text-white text-sm font-medium">
                Depoimento completo de {testimonialName}
              </p>
              <p className="text-gray-300 text-xs">{testimonialRole} - 2:15</p>
            </div>
          </div>
        </div>
        
        <div className="text-center text-gray-300 text-sm">
          <p>Vídeo será carregado em breve...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoTestimonialModal;
