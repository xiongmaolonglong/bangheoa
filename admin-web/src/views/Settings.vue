<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">系统配置</h1>
      <p class="page-desc">配置项目模板、表单字段、材料字典、地图 API Key 等</p>
    </div>

    <el-tabs v-model="activeTab" class="config-tabs">
      <!-- 表单与模板 -->
      <el-tab-pane label="表单与模板" name="form">
        <!-- 工单创建表单配置 -->
        <el-card class="mb-4">
          <template #header>
            <div class="card-header">
              <span>工单创建表单 — 配置补录工单时显示的字段</span>
              <div>
                <el-button size="small" @click="resetFormConfig" :loading="resetting">重置为默认</el-button>
                <el-button size="small" type="primary" @click="saveFormConfig" :loading="saving">保存配置</el-button>
              </div>
            </div>
          </template>

          <el-table :data="flatFieldList" row-key="field_key" border size="small" class="field-table">
            <el-table-column label="拖动排序" width="80" align="center">
              <template #default="{ row, $index }">
                <el-button size="small" :disabled="$index === 0" @click="moveField($index, -1)" link>↑</el-button>
                <el-button size="small" :disabled="$index === flatFieldList.length - 1" @click="moveField($index, 1)" link>↓</el-button>
              </template>
            </el-table-column>

            <el-table-column label="显示名称" width="180">
              <template #default="{ row }">
                <span :style="{ paddingLeft: (row._depth || 0) * 20 + 'px' }">
                  {{ row._depth ? '└ ' : '' }}{{ row.field_label }}
                </span>
              </template>
            </el-table-column>

            <el-table-column label="字段类型" prop="field_type" width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="row.field_type === 'subform' ? 'warning' : ''">{{ fieldTypeLabel(row.field_type) }}</el-tag>
              </template>
            </el-table-column>

            <el-table-column label="必填" width="80" align="center">
              <template #default="{ row }">
                <el-switch v-if="row.field_type !== 'subform'" v-model="row.required" size="small" />
              </template>
            </el-table-column>

            <el-table-column label="显示" width="80" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.visible" size="small" />
              </template>
            </el-table-column>

            <el-table-column label="占位提示" width="180">
              <template #default="{ row }">
                <el-input v-if="row.field_type !== 'subform'" v-model="row.placeholder" size="small" placeholder="可选" />
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>

            <el-table-column label="解析功能" width="100" align="center">
              <template #default="{ row }">
                <el-switch v-if="row.field_key === 'address'" v-model="row.enable_parse" size="small" />
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>

            <el-table-column label="下拉选项" min-width="200">
              <template #default="{ row }">
                <template v-if="row.field_type === 'select'">
                  <div class="option-tags">
                    <el-tag v-for="(opt, idx) in row.options" :key="idx" closable @close="removeOption(row, idx)"
                      size="small" style="margin: 2px 4px 2px 0">{{ opt.label }}</el-tag>
                    <el-input v-model="row._optionInput" size="small" placeholder="输入后回车添加" style="width: 140px; display: inline-block; vertical-align: middle;"
                      @keyup.enter="addOption(row)" @blur="addOption(row)" />
                  </div>
                </template>
                <template v-else-if="row.field_type === 'subform'">
                  <el-button size="small" type="primary" link @click="openSubformConfig(row)">
                    配置子项 ({{ subformChildCount(row) }})
                  </el-button>
                </template>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row, $index }">
                <el-button v-if="!isBuiltIn(row)" size="small" type="danger" link @click="removeField(row)">删除</el-button>
                <span v-else class="text-muted">不可删除</span>
              </template>
            </el-table-column>
          </el-table>

          <div class="add-field-row">
            <el-button size="small" type="primary" plain @click="showAddField = true">+ 添加自定义字段</el-button>
          </div>
        </el-card>

        <!-- 项目模板 -->
        <el-card>
          <template #header>
            <div class="card-header">
              <span>项目模板管理 — 配置代录测量时的面字段</span>
              <div>
                <el-button size="small" type="primary" @click="saveProjectTemplates" :loading="templateSaving">保存模板</el-button>
                <el-button size="small" type="primary" plain @click="addProjectTemplate">+ 新增项目</el-button>
              </div>
            </div>
          </template>

          <el-empty v-if="projectTemplates.length === 0" description="暂无项目模板，点击右上角添加" />

          <!-- 项目列表 -->
          <div v-for="(tmpl, tIdx) in projectTemplates" :key="tmpl.id || tIdx" class="project-tmpl">
            <div class="tmpl-header">
              <div class="tmpl-title-row">
                <span class="tmpl-index">{{ tIdx + 1 }}</span>
                <el-input v-model="tmpl.name" size="small" style="width: 200px" placeholder="项目名称（如520项目）" />
                <span class="tmpl-id-label">ID: {{ tmpl.id }}</span>
              </div>
              <div>
                <el-button size="small" type="primary" plain @click="addAdTypeToTemplate(tIdx)">+ 添加广告类型</el-button>
                <el-button size="small" type="danger" plain @click="removeProjectTemplate(tIdx)">删除项目</el-button>
              </div>
            </div>

            <!-- 广告类型列表 -->
            <div v-for="(adType, aIdx) in tmpl.ad_types" :key="adType.key || aIdx" class="ad-type-card">
              <div class="ad-type-header">
                <div class="ad-type-title-row">
                  <el-input v-model="adType.label" size="small" style="width: 180px" placeholder="广告类型名称" />
                  <span class="ad-type-key-label">key: {{ adType.key }}</span>
                </div>
                <div>
                  <el-button size="small" type="primary" plain @click="addFaceFieldToAdType(tmpl, aIdx)">+ 添加面字段</el-button>
                  <el-button size="small" type="danger" plain @click="removeAdTypeFromTemplate(tmpl, aIdx)">删除</el-button>
                </div>
              </div>

              <!-- 面字段列表 -->
              <el-table :data="adType.face_fields" border size="small" class="face-field-table">
                <el-table-column label="排序" width="80" align="center">
                  <template #default="{ $index: fIdx }">
                    <el-button size="small" :disabled="fIdx === 0" @click="moveFaceField(tmpl, adType, fIdx, -1)" link>↑</el-button>
                    <el-button size="small" :disabled="fIdx === adType.face_fields.length - 1" @click="moveFaceField(tmpl, adType, fIdx, 1)" link>↓</el-button>
                  </template>
                </el-table-column>

                <el-table-column label="字段标签" width="160">
                  <template #default="{ row }">
                    <el-input v-model="row.field_label" size="small" placeholder="如：长(m)" />
                  </template>
                </el-table-column>

                <el-table-column label="类型" width="130">
                  <template #default="{ row }">
                    <el-select v-model="row.field_type" size="small">
                      <el-option label="数字" value="number" />
                      <el-option label="文本" value="text" />
                      <el-option label="多行文本" value="textarea" />
                      <el-option label="下拉选择" value="select" />
                      <el-option label="图片上传" value="image" />
                      <el-option label="日期" value="date" />
                    </el-select>
                  </template>
                </el-table-column>

                <el-table-column label="单位" width="110" align="center">
                  <template #default="{ row }">
                    <el-select v-if="row.field_type === 'number'" v-model="row.field_unit" size="small" placeholder="选单位" clearable>
                      <el-option label="米" value="m" />
                      <el-option label="厘米" value="cm" />
                      <el-option label="毫米" value="mm" />
                    </el-select>
                    <span v-else class="text-muted">-</span>
                  </template>
                </el-table-column>

                <el-table-column label="字段角色" width="120" align="center">
                  <template #default="{ row }">
                    <el-select v-model="row.field_role" size="small" placeholder="选角色" clearable>
                      <el-option label="宽度" value="width" />
                      <el-option label="高度" value="height" />
                      <el-option label="面标签" value="label" />
                      <el-option label="额外字段" value="extra" />
                    </el-select>
                  </template>
                </el-table-column>

                <el-table-column label="必填" width="70" align="center">
                  <template #default="{ row }">
                    <el-switch v-model="row.required" size="small" />
                  </template>
                </el-table-column>

                <el-table-column label="占位提示" min-width="160">
                  <template #default="{ row }">
                    <el-input v-model="row.placeholder" size="small" placeholder="可选" />
                  </template>
                </el-table-column>

                <el-table-column label="下拉选项" min-width="200">
                  <template #default="{ row }">
                    <template v-if="row.field_type === 'select'">
                      <div class="option-tags">
                        <el-tag v-for="(opt, oIdx) in (row.options || [])" :key="oIdx" closable @close="row.options.splice(oIdx, 1)"
                          size="small" style="margin: 2px 4px 2px 0">{{ opt.label }}</el-tag>
                        <el-input v-model="row._optInput" size="small" placeholder="回车添加" style="width: 90px; display: inline-block;"
                          @keyup.enter="addFaceFieldOption(row)" @blur="addFaceFieldOption(row)" />
                      </div>
                    </template>
                    <span v-else class="text-muted">-</span>
                  </template>
                </el-table-column>

                <el-table-column label="操作" width="70" align="center">
                  <template #default="{ $index: fIdx }">
                    <el-button size="small" type="danger" link @click="removeFaceField(tmpl, adType, fIdx)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>

          <div class="save-hint">项目模板保存后，在测量代录和工单创建时会自动加载供用户选择</div>
        </el-card>
      </el-tab-pane>

      <!-- 地图配置 -->
      <el-tab-pane label="地图配置" name="map">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>腾讯地图 API Key</span>
              <el-button size="small" type="primary" @click="saveMapApiKey" :loading="mapKeySaving">保存</el-button>
            </div>
          </template>

          <el-form label-width="120px" style="max-width: 600px">
            <el-form-item label="API Key">
              <el-input v-model="mapApiKey" placeholder="请输入腾讯位置服务 API Key" clearable />
            </el-form-item>
            <el-form-item>
              <div class="map-key-hint">
                <p>获取方式：</p>
                <ol>
                  <li>访问 <a href="https://lbs.qq.com/" target="_blank">lbs.qq.com</a> 注册登录</li>
                  <li>进入「控制台」→「应用管理」→「创建密钥」</li>
                  <li>选择「WebServiceAPI」，勾选「地址解析」和「地点搜索」</li>
                  <li>复制密钥粘贴到上方保存即可</li>
                </ol>
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 材料字典 -->
      <el-tab-pane label="材料字典" name="material">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>材料字典管理</span>
              <div>
                <el-button size="small" type="primary" @click="saveMaterialDict" :loading="materialSaving">保存</el-button>
                <el-button size="small" type="primary" plain @click="addMaterialCategory">+ 新增分类</el-button>
              </div>
            </div>
          </template>

          <el-empty v-if="materialCategories.length === 0" description="暂无材料分类，点击右上角添加" />

          <div v-for="(cat, catIdx) in materialCategories" :key="catIdx" class="material-category">
            <div class="category-header">
              <el-input v-model="cat.name" size="small" style="width: 200px" placeholder="分类名称" />
              <el-button size="small" type="primary" plain @click="addMaterialItem(catIdx)">+ 添加材料</el-button>
              <el-button size="small" type="danger" plain @click="removeCategory(catIdx)">删除分类</el-button>
            </div>
            <el-table :data="cat.items" border size="small" class="mb-10">
              <el-table-column label="材料名称" width="200">
                <template #default="{ row }">
                  <el-input v-model="row.name" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="规格" width="150">
                <template #default="{ row }">
                  <el-input v-model="row.spec" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="单位" width="100">
                <template #default="{ row }">
                  <el-input v-model="row.unit" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="参考单价" width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.price" size="small" :min="0" :precision="2" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ $index: itemIdx }">
                  <el-button size="small" type="danger" link @click="removeMaterialItem(catIdx, itemIdx)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 设计颜色规范 -->
      <el-tab-pane label="设计规范" name="design">
        <el-card class="mb-4">
          <template #header>
            <div class="card-header">
              <span>尺寸检测设置</span>
              <el-button size="small" type="primary" @click="saveSizeCheckConfig" :loading="sizeCheckSaving">保存</el-button>
            </div>
          </template>

          <el-form label-width="140px" style="max-width: 600px">
            <el-form-item label="启用尺寸检测">
              <el-switch v-model="sizeCheckConfig.enabled" />
              <span class="form-hint">开启后，上传设计稿时自动检测图片尺寸是否符合要求</span>
            </el-form-item>
            <el-form-item label="尺寸误差阈值">
              <el-input-number v-model="sizeCheckConfig.tolerance" :min="1" :max="50" :step="1" />
              <span class="form-hint">允许的误差百分比，超过则提示警告（默认10%）</span>
            </el-form-item>
            <el-form-item label="设计稿DPI">
              <el-select v-model="sizeCheckConfig.dpi" style="width: 120px">
                <el-option label="72 DPI" :value="72" />
                <el-option label="96 DPI" :value="96" />
                <el-option label="150 DPI" :value="150" />
                <el-option label="300 DPI" :value="300" />
              </el-select>
              <span class="form-hint">设计稿分辨率，用于像素与毫米换算</span>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="mb-4">
          <template #header>
            <div class="card-header">
              <span>颜色检测设置</span>
              <el-button size="small" type="primary" @click="saveColorCheckConfig" :loading="colorCheckSaving">保存</el-button>
            </div>
          </template>

          <el-form label-width="140px" style="max-width: 600px">
            <el-form-item label="启用颜色检测">
              <el-switch v-model="colorCheckConfig.enabled" />
              <span class="form-hint">开启后，上传设计稿时自动检测图片主色调是否符合要求</span>
            </el-form-item>
            <el-form-item label="颜色误差阈值">
              <el-input-number v-model="colorCheckConfig.tolerance" :min="10" :max="100" :step="5" />
              <span class="form-hint">允许的颜色差异百分比，超过则提示警告（默认30%）</span>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card>
          <template #header>
            <div class="card-header">
              <span>颜色要求配置</span>
              <div>
                <el-button size="small" type="primary" @click="saveDesignColorRules" :loading="designColorSaving">保存</el-button>
                <el-button size="small" type="primary" plain @click="addDesignColorRule">+ 新增元素</el-button>
              </div>
            </div>
          </template>

          <el-empty v-if="designColorRules.length === 0" description="暂无颜色规范，点击右上角添加" />

          <el-table :data="designColorRules" border size="small">
            <el-table-column label="元素名称" width="200">
              <template #default="{ row }">
                <el-input v-model="row.name" size="small" placeholder="如：合成元素" />
              </template>
            </el-table-column>
            <el-table-column label="颜色要求" min-width="300">
              <template #default="{ row }">
                <el-input v-model="row.color" size="small" placeholder="如：主体黄色" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ $index }">
                <el-button size="small" type="danger" link @click="removeDesignColorRule($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="color-hint">
            <p>提示：</p>
            <ul>
              <li>元素名称需与工单录入的"元素"选项一致</li>
              <li>设计师上传设计稿时，系统会根据工单元素显示对应的颜色要求</li>
            </ul>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加自定义字段对话框 -->
    <el-dialog v-model="showAddField" title="添加自定义字段" width="500px">
      <el-form :model="newField" label-width="100px">
        <el-form-item label="显示名称">
          <el-input v-model="newField.field_label" placeholder="如：客户编号" @input="autoGenerateKey" />
        </el-form-item>
        <el-form-item label="字段标识">
          <el-input v-model="newField.field_key" readonly disabled style="color: var(--color-text-tertiary)" />
          <span class="field-key-hint">自动生成，无需手动填写</span>
        </el-form-item>
        <el-form-item label="字段类型">
          <el-select v-model="newField.field_type" style="width: 100%">
            <el-option label="单行文本" value="text" />
            <el-option label="多行文本" value="textarea" />
            <el-option label="数字" value="number" />
            <el-option label="日期" value="date" />
            <el-option label="下拉选择" value="select" />
            <el-option label="复选框" value="checkbox" />
            <el-option label="甲方选择" value="client_select" />
            <el-option label="审批人选择" value="approver_select" />
            <el-option label="地址选择（腾讯地图）" value="address" />
            <el-option label="图片上传" value="image" />
            <el-option label="文件上传" value="file" />
            <el-option label="子表单（嵌套）" value="subform" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="newField.field_type === 'subform'" label="子项说明">
          <el-alert type="info" :closable="false" show-icon>
            添加后点击「配置子项」可设置子表单内的字段（如材料类型→面→尺寸/朝向/备注）
          </el-alert>
        </el-form-item>
        <el-form-item label="是否必填">
          <el-switch v-model="newField.required" />
        </el-form-item>
        <el-form-item label="占位提示">
          <el-input v-model="newField.placeholder" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddField = false">取消</el-button>
        <el-button type="primary" @click="confirmAddField">确定</el-button>
      </template>
    </el-dialog>

    <!-- 子表单配置对话框 -->
    <el-dialog v-model="showSubformConfig" :title="'子项配置 - ' + (currentSubformField?.field_label || '')" width="700px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
        子表单内的字段会在用户填写时自动展开为可重复的卡片。支持嵌套：子表单内可以再包含子表单。
      </el-alert>

      <el-table :data="currentSubformChildren" row-key="field_key" border size="small" class="field-table">
        <el-table-column label="排序" width="80" align="center">
          <template #default="{ $index }">
            <el-button size="small" :disabled="$index === 0" @click="moveSubformChild($index, -1)" link>↑</el-button>
            <el-button size="small" :disabled="$index === currentSubformChildren.length - 1" @click="moveSubformChild($index, 1)" link>↓</el-button>
          </template>
        </el-table-column>

        <el-table-column label="显示名称" width="180">
          <template #default="{ row }">
            <el-input v-model="row.field_label" size="small" />
          </template>
        </el-table-column>

        <el-table-column label="字段类型" width="120">
          <template #default="{ row }">
            <el-select v-model="row.field_type" size="small" @change="onSubfieldTypeChange(row)">
              <el-option label="单行文本" value="text" />
              <el-option label="多行文本" value="textarea" />
              <el-option label="数字" value="number" />
              <el-option label="日期" value="date" />
              <el-option label="下拉选择" value="select" />
              <el-option label="图片上传" value="image" />
              <el-option label="子表单（嵌套）" value="subform" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="必填" width="80" align="center">
          <template #default="{ row }">
            <el-switch v-if="row.field_type !== 'subform'" v-model="row.required" size="small" />
          </template>
        </el-table-column>

        <el-table-column label="占位提示" width="160">
          <template #default="{ row }">
            <el-input v-if="row.field_type !== 'subform'" v-model="row.placeholder" size="small" placeholder="可选" />
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column label="下拉选项" min-width="180">
          <template #default="{ row }">
            <template v-if="row.field_type === 'select'">
              <div class="option-tags">
                <el-tag v-for="(opt, idx) in row.options" :key="idx" closable @close="removeOption(row, idx)"
                  size="small" style="margin: 2px 4px 2px 0">{{ opt.label }}</el-tag>
                <el-input v-model="row._optionInput" size="small" placeholder="回车添加" style="width: 100px; display: inline-block;"
                  @keyup.enter="addOption(row)" @blur="addOption(row)" />
              </div>
            </template>
            <template v-else-if="row.field_type === 'subform'">
              <el-button size="small" type="primary" link @click="openSubformConfig(row)">
                配置子项 ({{ subformChildCount(row) }})
              </el-button>
            </template>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" align="center">
          <template #default>
            <el-button size="small" type="danger" link @click="removeSubformChild()">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="add-field-row">
        <el-button size="small" type="primary" plain @click="addSubformChild">+ 添加子项字段</el-button>
      </div>

      <template #footer>
        <el-button @click="showSubformConfig = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'
import { logger } from '../utils/logger'

// ==================== 表单配置 ====================
const formFields = ref([])
const saving = ref(false)
const resetting = ref(false)
const showAddField = ref(false)
const newField = ref({ field_key: '', field_label: '', field_type: 'text', required: false, placeholder: '' })
const FORM_CONFIG_TYPE = 'work_order_create'

const fieldTypeMap = {
  text: '单行文本', textarea: '多行文本', number: '数字', date: '日期',
  select: '下拉选择', checkbox: '复选框', image: '图片上传', file: '文件上传',
  client_select: '甲方选择', approver_select: '审批人选择', address: '地址选择',
  subform: '子表单'
}
function fieldTypeLabel(type) { return fieldTypeMap[type] || type }

const builtInKeys = ['title', 'client_id', 'project_type', 'address', 'description', 'approver_id']
function isBuiltIn(row) { return builtInKeys.includes(row.field_key) }

function autoGenerateKey() {
  const label = newField.value.field_label.trim()
  if (!label) {
    newField.value.field_key = ''
    return
  }
  if (/^[\w\s]+$/.test(label)) {
    newField.value.field_key = label.toLowerCase().replace(/\s+/g, '_')
  } else {
    const customCount = formFields.value.filter(f => f.field_key.startsWith('field_')).length
    newField.value.field_key = `field_${customCount + 1}`
  }
}

// 平铺列表（用于表格展示，含缩进）
const flatFieldList = computed(() => {
  const result = []
  function flatten(fields, depth) {
    fields.forEach(f => {
      result.push({ ...f, _depth: depth })
      if (f.field_type === 'subform' && f.subform_template?.children?.length) {
        flatten(f.subform_template.children, depth + 1)
      }
    })
  }
  flatten(formFields.value.filter(f => !f.parent_key), 0)
  return result
})

// 选项管理
function initOptionsText(fields) {
  fields.forEach(f => {
    if (!Array.isArray(f.options)) f.options = []
    f._optionInput = ''
    if (f.enable_parse === undefined) f.enable_parse = false
    if (f.field_key === 'address') f.enable_parse = true
    if (f.subform_template?.children) initOptionsText(f.subform_template.children)
  })
}

function addOption(row) {
  const label = row._optionInput.trim()
  if (!label) return
  if (row.options.some(o => o.label === label)) { row._optionInput = ''; return }
  row.options.push({ label, value: label })
  row._optionInput = ''
}

function removeOption(row, idx) {
  row.options.splice(idx, 1)
}

function moveField(index, direction) {
  const flat = flatFieldList.value
  const row = flat[index]
  if (!row) return
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= flat.length) return

  // 找到在 formFields 中的真实位置
  const flatTarget = flat[newIndex]
  const srcIdx = formFields.value.indexOf(row)
  const tgtIdx = formFields.value.indexOf(flatTarget)
  if (srcIdx === -1 || tgtIdx === -1) return

  const temp = formFields.value[srcIdx]
  formFields.value.splice(srcIdx, 1)
  formFields.value.splice(tgtIdx, 0, temp)
}

function removeField(row) {
  if (isBuiltIn(row)) return
  // 如果删除的是 subform，同时删除其子项
  if (row.field_type === 'subform') {
    formFields.value = formFields.value.filter(f => f.field_key !== row.field_key && f.parent_key !== row.field_key)
  } else {
    formFields.value = formFields.value.filter(f => f.field_key !== row.field_key)
  }
}

async function loadFormConfig() {
  try {
    const res = await api.get(`/tenant/form-config/${FORM_CONFIG_TYPE}`)
    if (res.code === 0 && res.data) {
      formFields.value = res.data.fields || []
      initOptionsText(formFields.value)
    }
  } catch (err) {
    logger.error('加载表单配置失败:', err)
  }
}

async function saveFormConfig() {
  saving.value = true
  try {
    // 平铺所有字段（包括子表单的子项），加上 parent_key
    const flatFields = []
    function flattenToSave(fields, parentKey) {
      fields.forEach((f, i) => {
        const { _depth, _optionInput, ...rest } = f
        const saved = { ...rest, sort_order: i, parent_key: parentKey || null }
        // subform_template 只在顶层字段保存
        if (saved.field_type === 'subform') {
          saved.subform_template = saved.subform_template || null
        }
        flatFields.push(saved)
        if (f.field_type === 'subform' && f.subform_template?.children?.length) {
          flattenToSave(f.subform_template.children, f.field_key)
        }
      })
    }
    flattenToSave(formFields.value, null)

    await api.put(`/tenant/form-config/${FORM_CONFIG_TYPE}`, { fields: flatFields })
    await loadFormConfig()
    ElMessage.success('表单配置已保存')
  } catch (err) {
    logger.error('保存失败:', err.response?.data, err)
    ElMessage.error(err.response?.data?.message || err.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

async function resetFormConfig() {
  try {
    await ElMessageBox.confirm('确定重置为默认配置吗？自定义设置将被清除。', '提示', { type: 'warning' })
    resetting.value = true
    const res = await api.post(`/tenant/form-config/${FORM_CONFIG_TYPE}/reset`)
    if (res.code === 0 && res.data) {
      formFields.value = res.data.fields || []
      initOptionsText(formFields.value)
      ElMessage.success('已重置为默认配置')
    }
  } catch (err) {
    if (err !== 'cancel') ElMessage.error('重置失败')
  } finally {
    resetting.value = false
  }
}

function confirmAddField() {
  const f = newField.value
  if (!f.field_label) {
    ElMessage.warning('请输入显示名称')
    return
  }
  if (!f.field_key) autoGenerateKey()
  if (formFields.value.some(existing => existing.field_key === f.field_key)) {
    ElMessage.warning('字段标识已存在，请修改显示名称')
    return
  }
  const newF = {
    field_key: f.field_key, field_label: f.field_label, field_type: f.field_type,
    required: f.required, visible: true, sort_order: formFields.value.length,
    placeholder: f.placeholder, options: [], default_value: null,
    validation_rules: null, help_text: null,
    enable_parse: f.field_key === 'address',
    parent_key: null,
    subform_template: f.field_type === 'subform' ? { children: [] } : null,
  }
  formFields.value.push(newF)
  showAddField.value = false
  newField.value = { field_key: '', field_label: '', field_type: 'text', required: false, placeholder: '' }
}

// ==================== 子表单配置 ====================
const showSubformConfig = ref(false)
const currentSubformField = ref(null)
const currentSubformChildren = ref([])

function subformChildCount(field) {
  return field.subform_template?.children?.length || 0
}

function openSubformConfig(field) {
  currentSubformField.value = field
  if (!field.subform_template) field.subform_template = { children: [] }
  currentSubformChildren.value = field.subform_template.children
  if (!currentSubformChildren.value.length) {
    currentSubformChildren.value = []
  }
  showSubformConfig.value = true
}

function addSubformChild() {
  currentSubformChildren.value.push({
    field_key: 'field_' + (currentSubformChildren.value.length + 1),
    field_label: '新字段',
    field_type: 'text',
    required: false,
    visible: true,
    sort_order: currentSubformChildren.value.length,
    placeholder: '',
    options: [],
    _optionInput: '',
    parent_key: currentSubformField.value.field_key,
  })
}

function removeSubformChild() {
  if (currentSubformChildren.value.length) {
    currentSubformChildren.value.pop()
  }
}

function moveSubformChild(index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= currentSubformChildren.value.length) return
  const temp = currentSubformChildren.value[index]
  currentSubformChildren.value[index] = currentSubformChildren.value[newIndex]
  currentSubformChildren.value[newIndex] = temp
}

function onSubfieldTypeChange(row) {
  if (row.field_type === 'subform' && !row.subform_template) {
    row.subform_template = { children: [] }
  }
}

// ==================== 项目模板 ====================
const projectTemplates = ref([])
const templateSaving = ref(false)

const defaultTemplates = [
  {
    id: 'tmpl_520',
    name: '520项目',
    ad_types: [
      {
        key: 'signboard',
        label: '门头招牌',
        face_fields: [
          { field_key: 'width', field_label: '宽度', field_type: 'number', field_unit: 'm', field_role: 'width', required: true, placeholder: '请输入宽度' },
          { field_key: 'height', field_label: '高度', field_type: 'number', field_unit: 'm', field_role: 'height', required: true, placeholder: '请输入高度' },
          { field_key: 'direction', field_label: '朝向', field_type: 'select', field_role: 'label', required: false,
            options: [{ label: '东', value: '东' }, { label: '南', value: '南' }, { label: '西', value: '西' }, { label: '北', value: '北' }, { label: '左侧', value: '左侧' }, { label: '右侧', value: '右侧' }, { label: '正面', value: '正面' }, { label: '背面', value: '背面' }]
          },
          { field_key: 'note', field_label: '备注', field_type: 'textarea', required: false, placeholder: '该面特殊情况' },
        ]
      },
      {
        key: 'led_screen',
        label: 'LED大屏',
        face_fields: [
          { field_key: 'width', field_label: '宽度', field_type: 'number', field_unit: 'm', field_role: 'width', required: true, placeholder: '请输入宽度' },
          { field_key: 'height', field_label: '高度', field_type: 'number', field_unit: 'm', field_role: 'height', required: true, placeholder: '请输入高度' },
          { field_key: 'height_from_ground', field_label: '离地高度', field_type: 'number', field_unit: 'm', field_role: 'extra', required: false, placeholder: '可选' },
          { field_key: 'note', field_label: '备注', field_type: 'textarea', required: false, placeholder: '该面特殊情况' },
        ]
      },
    ]
  },
]

function initTemplateOptions(tmpls) {
  tmpls.forEach(tmpl => {
    tmpl.ad_types?.forEach(adType => {
      adType.face_fields?.forEach(f => {
        // 确保字段有默认值
        if (f.field_unit === undefined) f.field_unit = ''
        if (f.field_role === undefined) f.field_role = ''
        if (f.field_type === 'select') {
          if (!Array.isArray(f.options)) f.options = []
          f._optInput = ''
        }
      })
    })
  })
}

async function loadProjectTemplates() {
  try {
    const res = await api.get('/tenant/settings')
    const settings = res.data || {}
    if (settings.project_templates && settings.project_templates.length) {
      projectTemplates.value = settings.project_templates
    } else {
      projectTemplates.value = JSON.parse(JSON.stringify(defaultTemplates))
    }
    initTemplateOptions(projectTemplates.value)
  } catch {
    projectTemplates.value = JSON.parse(JSON.stringify(defaultTemplates))
    initTemplateOptions(projectTemplates.value)
  }
}

async function saveProjectTemplates() {
  templateSaving.value = true
  try {
    // Clean up transient _optInput fields
    const clean = JSON.parse(JSON.stringify(projectTemplates.value))
    await api.patch('/tenant/settings/project_templates', { value: clean })
    ElMessage.success('项目模板已保存')
    await loadProjectTemplates()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    templateSaving.value = false
  }
}

function addProjectTemplate() {
  const id = 'tmpl_' + Date.now()
  projectTemplates.value.push({ id, name: '新项目', ad_types: [] })
}

function removeProjectTemplate(idx) {
  ElMessageBox.confirm('确定删除此项目模板及所有关联的广告类型和面字段吗？', '提示', { type: 'warning' }).then(() => {
    projectTemplates.value.splice(idx, 1)
  }).catch(() => {})
}

function addAdTypeToTemplate(tIdx) {
  const key = 'adtype_' + Date.now()
  projectTemplates.value[tIdx].ad_types.push({ key, label: '新广告类型', face_fields: [] })
}

function removeAdTypeFromTemplate(tmpl, aIdx) {
  ElMessageBox.confirm('确定删除此广告类型及所有面字段吗？', '提示', { type: 'warning' }).then(() => {
    tmpl.ad_types.splice(aIdx, 1)
  }).catch(() => {})
}

function addFaceFieldToAdType(tmpl, aIdx) {
  tmpl.ad_types[aIdx].face_fields.push({
    field_key: 'field_' + (tmpl.ad_types[aIdx].face_fields.length + 1),
    field_label: '新字段',
    field_type: 'text',
    field_unit: '',
    field_role: '',
    required: false,
    placeholder: '',
    options: [],
    _optInput: '',
  })
}

function removeFaceField(tmpl, adType, fIdx) {
  adType.face_fields.splice(fIdx, 1)
}

function moveFaceField(tmpl, adType, fIdx, dir) {
  const newIdx = fIdx + dir
  if (newIdx < 0 || newIdx >= adType.face_fields.length) return
  const temp = adType.face_fields[fIdx]
  adType.face_fields[fIdx] = adType.face_fields[newIdx]
  adType.face_fields[newIdx] = temp
}

function addFaceFieldOption(row) {
  const label = row._optInput.trim()
  if (!label) return
  if (!row.options) row.options = []
  if (row.options.some(o => o.label === label)) { row._optInput = ''; return }
  row.options.push({ label, value: label })
  row._optInput = ''
}

// ==================== 地图配置 ====================
const mapApiKey = ref('')
const mapKeySaving = ref(false)

async function loadMapApiKey() {
  try {
    const res = await api.get('/tenant/settings')
    const settings = res.data || {}
    mapApiKey.value = settings.map_api_key || ''
  } catch {
    mapApiKey.value = ''
  }
}

async function saveMapApiKey() {
  mapKeySaving.value = true
  try {
    await api.patch('/tenant/settings/map_api_key', { value: mapApiKey.value })
    ElMessage.success('地图 Key 已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    mapKeySaving.value = false
  }
}

// ==================== 材料字典 ====================
const materialCategories = ref([])
const materialSaving = ref(false)

async function loadMaterialDict() {
  try {
    const res = await api.get('/tenant/settings')
    const settings = res.data || {}
    materialCategories.value = settings.material_dict || []
  } catch {
    materialCategories.value = []
  }
}

async function saveMaterialDict() {
  materialSaving.value = true
  try {
    await api.patch('/tenant/settings/material_dict', { value: materialCategories.value })
    ElMessage.success('材料字典已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    materialSaving.value = false
  }
}

function addMaterialCategory() {
  materialCategories.value.push({ name: '新分类', items: [] })
}

function removeCategory(index) {
  ElMessageBox.confirm('确定删除此分类及所有材料吗？', '提示', { type: 'warning' }).then(() => {
    materialCategories.value.splice(index, 1)
  }).catch(() => {})
}

function addMaterialItem(catIdx) {
  materialCategories.value[catIdx].items.push({ name: '', spec: '', unit: '', price: 0 })
}

function removeMaterialItem(catIdx, itemIdx) {
  materialCategories.value[catIdx].items.splice(itemIdx, 1)
}

// ==================== 设计颜色规范 ====================
const designColorRules = ref([])
const designColorSaving = ref(false)
const sizeCheckConfig = reactive({
  enabled: true,
  tolerance: 10,
  dpi: 96,
})
const sizeCheckSaving = ref(false)
const colorCheckConfig = reactive({
  enabled: true,
  tolerance: 30,
})
const colorCheckSaving = ref(false)

async function loadDesignColorRules() {
  try {
    const res = await api.get('/tenant/settings')
    const settings = res.data || {}
    designColorRules.value = settings.design_color_rules || []
    // 加载尺寸检测配置
    if (settings.size_check_config) {
      Object.assign(sizeCheckConfig, settings.size_check_config)
    }
    // 加载颜色检测配置
    if (settings.color_check_config) {
      Object.assign(colorCheckConfig, settings.color_check_config)
    }
  } catch {
    designColorRules.value = []
  }
}

async function saveDesignColorRules() {
  designColorSaving.value = true
  try {
    await api.patch('/tenant/settings/design_color_rules', { value: designColorRules.value })
    ElMessage.success('设计颜色规范已保存')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '保存失败')
  } finally {
    designColorSaving.value = false
  }
}

function addDesignColorRule() {
  designColorRules.value.push({ name: '', color: '' })
}

function removeDesignColorRule(index) {
  designColorRules.value.splice(index, 1)
}

async function saveSizeCheckConfig() {
  sizeCheckSaving.value = true
  try {
    await api.patch('/tenant/settings/size_check_config', { value: { ...sizeCheckConfig } })
    ElMessage.success('尺寸检测设置已保存')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '保存失败')
  } finally {
    sizeCheckSaving.value = false
  }
}

async function saveColorCheckConfig() {
  colorCheckSaving.value = true
  try {
    await api.patch('/tenant/settings/color_check_config', { value: { ...colorCheckConfig } })
    ElMessage.success('颜色检测设置已保存')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '保存失败')
  } finally {
    colorCheckSaving.value = false
  }
}

// ==================== 初始化 ====================
const activeTab = ref('form')

onMounted(() => {
  loadFormConfig()
  loadProjectTemplates()
  loadMaterialDict()
  loadMapApiKey()
  loadDesignColorRules()
})
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.text-muted { color: var(--color-text-placeholder); font-size: var(--font-size-xs); }
.mb-4 { margin-bottom: 16px; }
.mb-10 { margin-bottom: 10px; }

.config-tabs { margin-top: 16px; }
.field-table { margin-bottom: 12px; }
.add-field-row { margin-top: 12px; }

.material-category { margin-bottom: 20px; }
.category-header { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); }

.save-hint { color: var(--color-text-tertiary); font-size: var(--font-size-xs); margin-top: 12px; text-align: center; }
.field-key-hint { font-size: 12px; color: var(--color-text-placeholder); }
.option-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; min-height: 28px; }
.map-key-hint { color: var(--color-text-tertiary); font-size: 13px; line-height: 1.8; }
.map-key-hint a { color: var(--color-primary); text-decoration: underline; }
.map-key-hint ol { padding-left: 20px; margin: 4px 0 0; }

.color-hint { color: var(--color-text-tertiary); font-size: 13px; line-height: 1.8; margin-top: 12px; }
.color-hint ul { padding-left: 20px; margin: 4px 0 0; }
.form-hint { margin-left: 10px; color: var(--color-text-tertiary); font-size: 12px; }

/* 项目模板 */
.project-tmpl { margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #fafbfc; }
.tmpl-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
.tmpl-title-row { display: flex; align-items: center; gap: var(--space-2); }
.tmpl-index { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: var(--color-primary); color: #fff; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.tmpl-id-label { font-size: 12px; color: var(--color-text-placeholder); }

.ad-type-card { margin-bottom: 12px; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; background: #fff; }
.ad-type-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ad-type-title-row { display: flex; align-items: center; gap: var(--space-2); }
.ad-type-key-label { font-size: 12px; color: var(--color-text-placeholder); }

.face-field-table { margin-bottom: 8px; }
</style>
