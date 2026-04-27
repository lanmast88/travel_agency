import { Dialog, DialogContent } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { AuthPanel } from "./AuthPanel";
import { closeAuthDialog } from "./authSlice";

export function AuthDialog() {
  const dispatch = useDispatch();
  const { authDialogMessage, authDialogMode, authDialogOpen } = useSelector(
    (state) => state.auth,
  );

  return (
    <Dialog
      open={authDialogOpen}
      fullWidth
      maxWidth="sm"
      onClose={(_, reason) => {
        if (reason === "backdropClick") {
          return;
        }

        dispatch(closeAuthDialog());
      }}
      PaperProps={{
        className:
          "!rounded-[32px] !bg-white/95 !shadow-2xl backdrop-blur supports-[backdrop-filter]:!bg-white/90",
      }}
    >
      <DialogContent className="!px-6 !py-7 sm:!px-8 sm:!py-8">
        <AuthPanel
          initialMode={authDialogMode}
          bannerMessage={authDialogMessage}
          compact
          onSuccess={() => {
            dispatch(closeAuthDialog());
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
