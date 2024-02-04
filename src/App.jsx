import AudioPlayer from "./Component/AudioPlayer";
import ToggleBtn from "./Component/ToggleBtn";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <>
      <ToggleBtn />
      <AudioPlayer />
      <ToastContainer />
    </>
  );
}

export default App;
