export class InferenceSession {
  static async create(_path: string) {
    return new InferenceSession()
  }
  inputNames: string[] = ['input_ids', 'attention_mask', 'token_type_ids']
  outputNames: string[] = ['last_hidden_state']
  async run(_feeds: any) {
    const dims = [1, 16, 384]
    const data = new Float32Array(dims[1] * dims[2])
    return { last_hidden_state: { data, dims } }
  }
  release() {}
}
export default InferenceSession
