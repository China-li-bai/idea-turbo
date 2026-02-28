import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '服务条款 | Terms of Service | 文本转语音',
  description: '文本转语音服务的使用条款和条件 | Terms and conditions for the Text-to-Speech service',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4">
      <div className="max-w-5xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            服务条款
          </h1>
          <h2 className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300">
            Terms of Service
          </h2>
        </div>
        
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8 text-center">
          最后更新日期：2025年1月12日 | Last Updated: January 12, 2025
        </p>

        <div className="prose dark:prose-invert max-w-none space-y-8">
          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              1. 接受条款 | Acceptance of Terms
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  欢迎使用文本转语音服务（以下简称"本服务"）。通过访问或使用本服务，您同意受本服务条款的约束。如果您不同意这些条款，请不要使用本服务。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Welcome to the Text-to-Speech service (hereinafter referred to as "the Service"). By accessing or using the Service, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              2. 服务描述 | Service Description
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  本服务提供文本转语音功能，允许用户将文本内容转换为语音播放。我们提供多种语音选择和自定义选项，包括 Web Speech API 和 Edge-TTS 等不同的语音合成服务。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  The Service provides text-to-speech functionality, allowing users to convert text content into audio playback. We offer various voice options and customization features, including different speech synthesis services such as Web Speech API and Edge-TTS.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              3. 用户资格 | User Eligibility
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  您必须年满 13 岁才能使用本服务。如果您未满 13 岁，请在父母或监护人的指导下使用本服务。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  You must be at least 13 years old to use the Service. If you are under 13, please use the Service under the guidance of a parent or guardian.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              4. 用户责任 | User Responsibilities
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  使用本服务时，您同意：
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>仅将本服务用于合法目的</li>
                  <li>不输入或转换任何违法、有害、威胁、辱骂、骚扰、诽谤、粗俗、淫秽或其他令人反感的内容</li>
                  <li>不侵犯他人的知识产权、隐私权或其他权利</li>
                  <li>不尝试干扰或破坏本服务的正常运行</li>
                  <li>不使用自动化工具（如机器人、爬虫）访问本服务</li>
                  <li>不逆向工程、反编译或反汇编本服务的任何部分</li>
                  <li>遵守所有适用的法律法规</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  When using the Service, you agree to:
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>Use the Service only for lawful purposes</li>
                  <li>Not input or convert any illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable content</li>
                  <li>Not infringe upon the intellectual property, privacy, or other rights of others</li>
                  <li>Not attempt to interfere with or disrupt the normal operation of the Service</li>
                  <li>Not use automated tools (such as bots, crawlers) to access the Service</li>
                  <li>Not reverse engineer, decompile, or disassemble any part of the Service</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              5. 禁止行为 | Prohibited Activities
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  严禁以下行为：
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>使用本服务生成虚假、误导性或欺骗性的音频内容</li>
                  <li>冒充他人或实体</li>
                  <li>传播垃圾信息、恶意软件或病毒</li>
                  <li>未经授权访问本服务或他人的账户</li>
                  <li>收集或存储他人的个人信息</li>
                  <li>违反任何适用的法律法规</li>
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  The following activities are strictly prohibited:
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>Using the Service to generate fake, misleading, or deceptive audio content</li>
                  <li>Impersonating any person or entity</li>
                  <li>Distributing spam, malware, or viruses</li>
                  <li>Unauthorized access to the Service or others' accounts</li>
                  <li>Collecting or storing others' personal information</li>
                  <li>Violating any applicable laws and regulations</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              6. 知识产权 | Intellectual Property
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  本服务及其所有内容、功能、设计和界面均受知识产权法保护。您不得复制、修改、分发、展示、执行、转载、创建衍生作品或以其他方式使用本服务的任何部分，除非获得我们的明确书面许可。
                </p>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-2">
                  您输入的文本内容的知识产权归您所有，但您授予我们使用、存储和处理该内容的权利，以便为您提供本服务。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  The Service and all its content, features, design, and interface are protected by intellectual property laws. You may not copy, modify, distribute, display, perform, reproduce, create derivative works, or otherwise use any part of the Service without our express written permission.
                </p>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-2">
                  You retain ownership of the intellectual property in the text content you input, but you grant us the right to use, store, and process such content to provide the Service to you.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              7. 免责声明 | Disclaimer
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  本服务按"现状"和"可用"基础提供，不提供任何明示或暗示的保证，包括但不限于：
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>服务将不间断、及时、安全或无错误</li>
                  <li>服务将满足您的要求</li>
                  <li>服务的准确性、可靠性或可用性</li>
                  <li>从服务获得的任何信息或材料的质量</li>
                </ul>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-4">
                  您使用本服务的风险由您自行承担。对于因使用或无法使用本服务而导致的任何直接或间接损失，我们不承担责任。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  The Service is provided on an "as is" and "as available" basis, without any warranties of any kind, either express or implied, including but not limited to:
                </p>
                <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 space-y-2">
                  <li>The Service will be uninterrupted, timely, secure, or error-free</li>
                  <li>The Service will meet your requirements</li>
                  <li>The accuracy, reliability, or availability of the Service</li>
                  <li>The quality of any information or material obtained from the Service</li>
                </ul>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-4">
                  You use the Service at your own risk. We are not liable for any direct or indirect damages resulting from the use or inability to use the Service.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              8. 服务变更和终止 | Service Changes and Termination
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  我们保留随时修改、暂停或终止本服务的权利，恕不另行通知。我们不对您或任何第三方承担因服务修改、暂停或终止而产生的任何责任。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  We reserve the right to modify, suspend, or terminate the Service at any time without prior notice. We are not liable to you or any third party for any liability arising from the modification, suspension, or termination of the Service.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              9. 第三方服务 | Third-Party Services
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  本服务可能使用第三方服务（如 Edge-TTS）。这些第三方服务有其自己的条款和隐私政策。我们不控制这些第三方服务，也不对其内容或行为负责。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  The Service may use third-party services (such as Edge-TTS). These third-party services have their own terms and privacy policies. We do not control these third-party services and are not responsible for their content or actions.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              10. 赔偿 | Indemnification
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  您同意赔偿并使我们、我们的员工、承包商、代理商和合作伙伴免受因您违反本服务条款或侵犯任何第三方权利而产生的任何索赔、损失、损害、责任、成本和费用（包括律师费）。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  You agree to indemnify and hold us, our employees, contractors, agents, and partners harmless from any claims, losses, damages, liabilities, costs, and expenses (including attorney fees) arising from your violation of these Terms of Service or infringement of any third-party rights.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              11. 责任限制 | Limitation of Liability
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  在法律允许的最大范围内，我们不对任何间接、偶然、特殊、后果性或惩罚性损害承担责任，无论是否基于合同、侵权（包括疏忽）或其他责任理论，即使我们已被告知此类损害的可能性。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages, whether based on contract, tort (including negligence), or other theory of liability, even if we have been advised of the possibility of such damages.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              12. 争议解决 | Dispute Resolution
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  本服务条款受中华人民共和国法律管辖。任何因本服务条款引起的争议应首先通过友好协商解决。协商不成的，任何一方均可向有管辖权的人民法院提起诉讼。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  These Terms of Service are governed by the laws of the People's Republic of China. Any dispute arising from these Terms of Service shall first be resolved through friendly negotiation. If negotiation fails, either party may file a lawsuit in a competent people's court.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 dark:border-zinc-700 pb-8">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              13. 条款变更 | Changes to Terms
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  我们保留随时修改本服务条款的权利。修改后的条款将在本页面发布，并更新"最后更新日期"。继续使用本服务即表示您接受修改后的条款。
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  We reserve the right to modify these Terms of Service at any time. The modified terms will be posted on this page with an updated "Last Updated" date. Continued use of the Service constitutes acceptance of the modified terms.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              14. 联系我们 | Contact Us
            </h2>
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  如果您对本服务条款有任何疑问，请通过以下方式联系我们：
                </p>
                <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
                  <p><strong>邮箱：</strong> your-email@example.com</p>
                  <p><strong>网站：</strong> https://your-domain.com</p>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                  If you have any questions about these Terms of Service, please contact us through the following channels:
                </p>
                <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
                  <p><strong>Email:</strong> your-email@example.com</p>
                  <p><strong>Website:</strong> https://your-domain.com</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
