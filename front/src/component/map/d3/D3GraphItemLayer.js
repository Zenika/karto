import D3GraphLayer from './D3GraphLayer';

export default class D3GraphItemLayer extends D3GraphLayer {

    attach(svgElement) {
        super.attach(svgElement);
        this.itemSvgContainer = svgElement.select('#items').append('g').attr('class', this.name);
        this.labelSvgContainer = svgElement.select('#labels').append('g').attr('class', `${this.name}-labels`);
    }
}
