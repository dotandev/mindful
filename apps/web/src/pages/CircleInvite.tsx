import { setCircleSurah } from "@mindfulverse/core/circleSurah";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

// A study circle's invite link (/circle/<n>): remember the circle's surah,
// then land on that surah's about screen. An invalid number goes Home.
export default function CircleInvite() {
  const { surah } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const n = setCircleSurah(surah);
    navigate(n === null ? "/" : `/tadabbur/${n}`, { replace: true });
  }, [surah, navigate]);

  return null;
}
