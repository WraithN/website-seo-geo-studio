import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJSON, getText } from '../api';

export default function SkillDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [skill, setSkill] = useState<any>(null);
  const [refs, setRefs] = useState<string[]>([]);
  const [refContent, setRefContent] = useState<{ name: string; body: string } | null>(null);

  useEffect(() => {
    getJSON('/skills/' + slug).then((s) => {
      setSkill(s);
      try { setRefs(JSON.parse(s.references_list || '[]')); } catch { setRefs([]); }
    }).catch(() => setSkill(null));
  }, [slug]);

  if (skill === null) return <div className="loading">加载中…</div>;
  if (!skill) return <div className="loading">未找到该技能。</div>;

  return (
    <>
      <span className="back" onClick={() => nav('/skills')}>← 返回技能库</span>
      <section className="hero">
        <div className="kicker">{skill.suite}</div>
        <h1>{skill.name}</h1>
        <p className="hero-sub">{skill.description}</p>
      </section>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>SKILL.md 全文</h3>
        <div className="markdown">{skill.body}</div>
      </div>

      {refs.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3>共享 References（{refs.length}）</h3>
          <div className="ref-list">
            {refs.map((f) => (
              <div key={f} className="ref-item">
                <span className="tag">{f}</span>
                <button className="btn ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={async () => {
                  const txt = await getText(`/skills/${slug}/references/${f}`);
                  setRefContent({ name: f, body: txt });
                }}>查看</button>
              </div>
            ))}
          </div>
          {refContent && (
            <div className="markdown" style={{ marginTop: 12 }}>{refContent.name}\n\n{refContent.body}</div>
          )}
        </div>
      )}
    </>
  );
}
