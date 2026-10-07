import type { TemplateModule } from "../../../contract"
import { Intro } from "./blocks/Intro"
import { PageDecoration } from "./blocks/PageDecoration"
import { PageFooter } from "./blocks/PageFooter"
import { PageHeader } from "./blocks/PageHeader"
import { Row, TableHead } from "./blocks/Table"
import { Terminal } from "./blocks/Terminal"
import { manifest } from "./manifest"
import "./template.css"

const studioV1: TemplateModule = {
  manifest,
  PageHeader,
  Intro,
  TableHead,
  Row,
  Terminal,
  PageFooter,
  PageDecoration,
}

export default studioV1
