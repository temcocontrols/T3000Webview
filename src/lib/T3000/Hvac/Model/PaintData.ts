
import { Type } from 'class-transformer'
import 'reflect-metadata'

import TextureScale from './TextureScale'
import ConstantData from '../Data/ConstantData'

class PaintData {

  public FillType: number;
  public Color: string;
  public EndColor: string;
  public GradientFlags: number;
  public Texture: number;

  @Type(() => TextureScale)
  public TextureScale: TextureScale;

  public Opacity: number;
  public EndOpacity: number;

  constructor(color: string) {

    this.FillType = ConstantData.FillTypes.SDFILL_SOLID;
    this.Color = color;
    this.EndColor = ConstantData.Colors.Color_White;
    this.GradientFlags = 0;
    this.Texture = 0;
    this.TextureScale = new TextureScale();
    this.Opacity = 1;
    this.EndOpacity = 1;

  }
}

export default PaintData
