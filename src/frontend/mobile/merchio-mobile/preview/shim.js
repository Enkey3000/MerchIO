const mem={};
export default {
  getItem: async k => { try { return localStorage.getItem(k); } catch (e) { return mem[k] ?? null; } },
  setItem: async (k, v) => { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
  removeItem: async k => { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } },
};
